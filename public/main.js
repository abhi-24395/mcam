const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  localVideo.srcObject = localStream;

  socket.emit('offer', await createOffer());
}

async function createOffer() {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}

socket.on('offer', async (offer) => {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    peerConnection.ontrack = event => {
      remoteVideo.srcObject = event.streams[0];
    };

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate) => {
  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

start();
