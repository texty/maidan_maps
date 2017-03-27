var videos = document.querySelectorAll('video');

 if (location.search === '?enabled=true') {
	enableVideos(true);
} else {
	enableVideos();
}

function enableButtons(video) {
	var playBtn = document.getElementById('play-btn');

	if (playBtn) {
		playBtn.addEventListener('click', function () {
			if (video.paused) {
				$(this).html('<i class="fa fa-pause play fa-2x" aria-hidden="true">');
				video.play();
				$("#hint").hide();
			} else {
				video.pause();
				$(this).html('<i class="fa fa-play play fa-2x" aria-hidden="true">');
				$("#hint").hide();
			}
		});
	}
}

// debug events
function debugEvents(video) {
	[
		'loadstart',
		'progress',
		'suspend',
		'abort',
		'error',
		'emptied',
		'stalled',
		'loadedmetadata',
		'loadeddata',
		'canplay',
		'canplaythrough',
		'playing', // fake event
		'waiting',
		'seeking',
		'seeked',
		'ended',
	// 'durationchange',
		'timeupdate',
		'play', // fake event
		'pause', // fake event
	// 'ratechange',
	// 'resize',
	// 'volumechange',
		'webkitbeginfullscreen',
		'webkitendfullscreen',
	].forEach(function (event) {
		video.addEventListener(event, function () {
			console.info('@', event);
		});
	});
}

function enableVideos(everywhere) {
	for (var i = 0; i < videos.length; i++) {
		window.enableInlineVideo(videos[i], {everywhere: everywhere});
		enableButtons(videos[i]);
		debugEvents(videos[i]);
	}
}
