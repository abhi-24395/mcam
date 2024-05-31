const socket = io();
const videoContainer = document.getElementById('videoContainer');

let localStream;
let peerConnections = {};
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

document.getElementById('startSender').addEventListener('click', async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  registerAs('sender');
});

document.getElementById('startReceiver').addEventListener('click', () => {
  registerAs('receiver');
});

function registerAs(role) {
  socket.emit('register', role);
  if (role === 'receiver') {
    socket.on('offer', handleOffer);
    socket.on('candidate', handleCandidate);
  } else if (role === 'sender') {
    createPeerConnections();
  }
}

function createPeerConnections() {
  for (let id in peerConnections) {
    if (!peerConnections[id]) {
      peerConnections[id] = new RTCPeerConnection(config);
      localStream.getTracks().forEach(track => {
        peerConnections[id].addTrack(track, localStream);
      });
      peerConnections[id].onicecandidate = event => {
        if (event.candidate) {
          socket.emit('candidate', { candidate: event.candidate, targetId: id });
        }
      };
      createOffer(id);
    }
  }
}

async function createOffer(receiverId) {
  const offer = await peerConnections[receiverId].createOffer();
  await peerConnections[receiverId].setLocalDescription(offer);
  socket.emit('offer', { offer, receiverId });
}

async function handleOffer(data) {
  const { offer, senderId } = data;
  if (!peerConnections[senderId]) {
    peerConnections[senderId] = new RTCPeerConnection(config);
    peerConnections[senderId].onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', { candidate: event.candidate, targetId: senderId });
      }
    };
    peerConnections[senderId].ontrack = event => {
      const video = document.createElement('video');
      video.srcObject = event.streams[0];
      video.autoplay = true;
      videoContainer.appendChild(video);
    };
  }
  await peerConnections[senderId].setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnections[senderId].createAnswer();
  await peerConnections[senderId].setLocalDescription(answer);
  socket.emit('answer', { answer, senderId });
}

async function handleAnswer(data) {
  const { answer, receiverId } = data;
  await peerConnections[receiverId].setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(data) {
  const { candidate, senderId } = data;
  await peerConnections[senderId].addIceCandidate(new RTCIceCandidate(candidate));
}

socket.on('answer', handleAnswer);
