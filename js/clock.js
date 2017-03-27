(function(){

    $(document).ready(function(){
        var checkpoints = $("[data-timestamp]");
        var episodes = $("[data-episode]");

        var window_height = $(window).height();

        var timestamps = checkpoints.map(function(i, d) {
            var arr = $(d).attr('data-timestamp').match(/(\d\d)\s(\d\d):(\d\d)/);
            return new Date(2014, 1, arr[1], arr[2], arr[3]);
        });

        var check_offsets = checkpoints.map(function(i, d) {
            return $(d).offset().top;
        });

        var episode_offsets = episodes.map(function(i, d) {
            return $(d).offset().top;
        });

        $(window).scroll(function() {
            var middle = $(window).scrollTop() + window_height/2;

            var check = currentCheckpoint(middle);
            var epi = currentEpisode(middle);

            if (epi != window.__episode__) {
                $('.clock-in-da-top').trigger("episode-changed", epi);
                window.__episode__ = epi;
            }

            if (check < 0) return;

            var date;
            if (check < timestamps.length - 1) {
                var off_p = check_offsets[check];
                var off_n = check_offsets[check + 1];

                var time_p = timestamps[check];
                var time_n = timestamps[check + 1];

                var interpolate = d3.interpolateDate(time_p, time_n);

                date = interpolate((middle - off_p)/(off_n-off_p));
            } else {
                date = timestamps[timestamps.length - 1];
            }
            drawDate(date);
        });

        function currentCheckpoint(middle) {
            for (var i=check_offsets.length-1; i>=0; i--) {
                var offset = check_offsets[i];
                if (middle > offset) break;
            }
            return i;
        }

        function currentEpisode(middle) {
            for (var i=episode_offsets.length-1; i>=0; i--) {
                var offset = episode_offsets[i];
                if (middle > offset) break;
            }
            return i;
        }

        var top_margin = 20;
        function scrollToEpisode(epi) {
            epi = minmax(epi, 0, episode_offsets.length - 1);

            $('html, body').animate({
                scrollTop: episode_offsets[epi] - top_margin
            }, 3000);
        }

        $('.clock-in-da-top').on('episode-changed', function(e, epi){
            if (epi < 0) {
                // $('#clock-backward-btn').addClass('disabled');
                $('#clock-forward-btn').removeClass('disabled');
                return;
            }

            if (epi > 0 && epi < episodes.length - 1) {
                // $('#clock-backward-btn').removeClass('disabled');
                $('#clock-forward-btn').removeClass('disabled');
                return;
            }

            if (epi >= episodes.length - 1) {
                // $('#clock-backward-btn').removeClass('disabled');
                $('#clock-forward-btn').addClass('disabled');
            }
        });

        $('#clock-forward-btn').click(function() { scrollToEpisode(window.__episode__ + 1)});
        $('#clock-backward-btn').click(function() {
            var epi = window.__episode__;

            if (episode_offsets[epi] - top_margin < $(window).scrollTop())
                scrollToEpisode(epi);
            else
                scrollToEpisode(epi-1);
        })
    });

    $('#two').waypoint(function(direction) {
        if (direction === 'down') {
            $(".mute-btn-wrapper, .legend").fadeIn(400);
        } else if (direction === 'up') {
            $(".mute-btn-wrapper, .legend").fadeOut(400);
        }
    },{ offset: 150 });

    var timeFormat = d3.timeFormat("%H:%M");
    var dayFormat = d3.timeFormat("%d");

    function drawDate(date) {
        $('.clock-in-da-top .day-number').text(dayFormat(date));
        $('.clock-in-da-top .time').text(timeFormat(date));
    }
    
    function minmax(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

})($);