const ip = window.location.hostname;
const socket = new WebSocket(`ws://${ip}:4434`);

socket.addEventListener('open', function (event) {
    console.log('WebSocket connection opened');
});

socket.addEventListener('message', function(event) {
    data = JSON.parse(event.data);
    document.querySelector('.slides').innerHTML = data.slides;

    const seminarServer = data.seminar.server;
    const seminarUrl = data.seminar.url;
    const seminarRoom = data.seminar.room;
    const seminarHash = data.seminar.hash;

    const printPlugins = [
        RevealNotes,
        RevealHighlight,
        RevealMath.MathJax3,
        RevealAnimate,
        RevealChalkboard, 
        RevealChart,
    ];

    const plugins = [
        ...printPlugins,
        RevealZoom, 
        RevealSearch, 
        RevealMarkdown, 
        RevealMenu, 
        RevealFullscreen,
        RevealAnything,
        //RevealAudioSlideshow,
        //RevealAudioRecorder,
        RevealCustomControls, 
        RevealSeminar,
        RevealPoll,
        RevealQnA,
        Verticator 
    ];

    Reveal.initialize({
        plugins: plugins,
        controls: false,

        chalkboard: {
            storage: "chalkboard",
        },
        highlight: {
            highlightOnLoad: true,
            lineNumbers: true
        },
        markdown: {
            smartypants: true
        },
        /*math: {
            mathjax: 'https://cdn.jsdelivr.net/gh/mathjax/mathjax@2.7.8/MathJax.js',
            config: 'TeX-AMS_HTML-full',
            // pass other options into `MathJax.Hub.Config()`
            TeX: { Macros: { RR: "{\\bf R}" } }
        },*/
        anything: [ 
            {
            className: "plot",
            defaults: {width:500, height: 500, grid:true},
            initialize: (function(container, options){ options.target = "#"+container.id; functionPlot(options) })
            },
            {
            className: "chart",  
            initialize: (function(container, options){ container.chart = new Chart(container.getContext("2d"), options);  })
            },
            {
            className: "anything",
            initialize: (function(container, options){ if (options && options.initialize) { options.initialize(container)} })
            },
        ],
        chart: {
            defaults: { 
            color: 'lightgray', // color of labels
            scale: { 
                beginAtZero: true, 
                ticks: { stepSize: 1 },
                grid: { color: "lightgray" } , // color of grid lines
            },
            },
            line: { borderColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ], "borderDash": [ [5,10], [0,0] ] }, 
            bar: { backgroundColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ]}, 
            pie: { backgroundColor: [ ["rgba(0,0,0,.8)" , "rgba(220,20,20,.8)", "rgba(20,220,20,.8)", "rgba(220,220,20,.8)", "rgba(20,20,220,.8)"] ]},
            radar: { borderColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ]}, 
        },
        audio: {
            prefix: 'audio/', // audio files are stored in the "audio" folder
            suffix: '.ogg', // audio files have the ".ogg" ending
            textToSpeechURL: null, // the URL to the text to speech converter
            defaultNotes: false, // use slide notes as default for the text to speech converter
            defaultText: false, // use slide text as default for the text to speech converter
            advance: 0, // advance to next slide after given time in milliseconds after audio has played, use negative value to not advance
            autoplay: false, // automatically start slideshow
            defaultDuration: 5, // default duration in seconds if no audio is available
            defaultAudios: true, // try to play audios with names such as audio/1.2.ogg
            playerOpacity: 0.05, // opacity value of audio player if unfocused
            playerStyle: 'position: fixed; bottom: 4px; left: 25%; width: 50%; height:75px; z-index: 33;', // style used for container of audio controls
            startAtFragment: false, // when moving to a slide, start at the current fragment or at the start of the slide
        },
        customcontrols: {
            controls: [
                {
                    id: 'toggle-overview',
                    title: 'Toggle overview (O)',
                    icon: '<i class="fa fa-th"></i>',
                    action: 'Reveal.toggleOverview();'
                },
                {
                    id: 'toggle-questions',
                    title: 'Toggle Q&A dashboard (Q)',
                    icon: '<span class="fa-stack" style="margin: -24px -12px;padding:0;"><span class="fa-solid fa-comment fa-stack-1x"></span><strong class="fa-stack-1x fa-inverse qna question-counter" style="font-size:0.5em;"></strong></span>',
                    action: 'RevealQnA.toggleQnA();'
                }
            ]
        },
        seminar: {
            server: seminarServer,
            url: seminarUrl,
            room: seminarRoom,
            hash: seminarHash,
            autoJoin: false
        }
    });

    Reveal.on('ready', () => {
        RevealSeminar.join_room('User');
        // Fix blurr background because of notescanvas
        document.getElementById("notescanvas").style.visibility = "hidden";
        document.querySelectorAll('pre code').forEach((el) =>{
            hljs.highlightElement(el);
        });
        socket.close();
    });
});