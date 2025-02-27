document.addEventListener("DOMContentLoaded", async () => {
    /* My Consts */
    const startButton = document.getElementById("start-btn");
    const replayButton = document.getElementById("replay-btn");
    const resetButton = document.getElementById("reset-btn");
    const pads = document.getElementsByClassName("pad");
    const levelindicator = document.getElementById("level-indicator");
    const modal = document.getElementById("failure-modal");
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const colorMap ={
        "pad-red": "red",
        "pad-yellow": "yellow",
        "pad-green": "green",
        "pad-blue": "blue"
    };
    const inputMap = {
        "q": document.getElementById("pad-red"),
        "w": document.getElementById("pad-yellow"),
        "a": document.getElementById("pad-green"),
        "s": document.getElementById("pad-blue")
    };
    const noteFreq = {
        "pad-red": 261.626,
        "pad-yellow": 293.665,
        "pad-green": 330.000,
        "pad-blue": 349.228
    };
    
    /* My lets */
    let highscore = document.getElementById("high-score");
    highscore.innerHTML = localStorage.getItem("highscore") || "0";
    let gameSequence = [];
    let userSequence = [];
    let gameStarted = false;
    let level = 1;
    let seqPlaying = false;
    let inputOff = false;
    let Osc = new Tone.Oscillator().toDestination();


    /* My screams */
    const next_level = new CustomEvent("next level", {
        detail: {message: "next level!"}
    });
    const wrong = new CustomEvent("wrong sequence", {
        detail: {message: "incorrect dummy!"}
    });
    
    /* call endpoint for game reset
        reset constants and lets */
    const putGameState = async () => {
        const url = "http://localhost:3000/api/v1/game-state";

        try {
            const response = await axios.put(url);

            console.log("Success: ", response.data);
            console.log("Sequence:", response.data.gameState.sequence);

            highscore.innerHTML = response.data.gameState.highScore;
            gameSequence =[...response.data.gameState.sequence];
            level = response.data.gameState.level;

            console.log("updated:", level);

        } 
        catch (error) {
            console.log(error);
        }
    };

    /* send user sequence for verification
        updates game sequence and relevent const and lets
        dispatch event depending on response */
    const sendUserSequence = async () => {
        const url = "http://localhost:3000/api/v1/game-state/sequence";
        
        try {
            const response = await axios.post(url, {
                "sequence": userSequence
            });

            console.log("new sequence:", response.data.gameState.sequence);
            console.log(response.data.gameState.level);
            
            gameSequence = [...response.data.gameState.sequence];

            console.log(gameSequence);
            console.log("player sequence:", userSequence);

            userSequence = [];

            console.log("reset:",userSequence);

            level = response.data.gameState.level;
            levelindicator.innerHTML = level;
            
            if (level > (parseInt(localStorage.getItem("highscore")) || "0")) {
                localStorage.setItem("highscore", level);
                highscore.innerHTML = level;
            };

            document.dispatchEvent(next_level);
        
        } catch (error) {
            console.log(error);
            
            if (error.response && error.response.status === 400) {
                document.dispatchEvent(wrong);
            } 
        }
    };

    /* play tune when pad is active with relevent note and oscullator */
    const playTune = async (padId) => {
        if (inputOff)
            return;
        inputOff = true;

        let note = noteFreq[padId];
        const selectedOsc = document.getElementById("sound-select").value;

        Osc.type = selectedOsc;
        Osc.frequency.value = note;

        Osc.start();
        await delay(500);
        Osc.stop();

        inputOff = false;
    };

    /* change pad to active depending on color
        check's user sequence when correct length reached */
    const padactive = async (pad) => {
        if (!gameStarted || inputOff) 
            return;

        console.log(pad.id);

        pad.classList.add("active");

        await playTune(pad.id);
        await delay(500);

        pad.classList.remove("active");  
    };

    const checkSequence = () => {
        if (userSequence.length === level) {
            sendUserSequence();
        }
    };
        
    /* click event listener for pads */
    Array.from(pads).forEach(pad => {
        pad.addEventListener("click",() => {
            if (!gameStarted || seqPlaying || inputOff)
                return;

            padactive(pad);

            userSequence.push(colorMap[pad.id]);

            console.log(userSequence);
            console.log(level);
            console.log(userSequence.length);

            checkSequence();
        });
    });
    
    /* activates correct color for playing game sequence */
    const inputSequence = async (color) => {
        if (!gameStarted)
            return;

        await padactive(document.getElementById(`pad-${color}`));
    };
    
    /* plays game sequence
        sets seqPlaying state and disables replay so 
        player cant use buttons during seq playing */
    const playSequence = async () => {
        if (!gameStarted)
            return;
        
        seqPlaying = true;

        replayButton.disabled = true;

        console.log("Playing Sequence:", gameSequence);

        await gameSequence.reduce(async (prevPromise, color) => {
            await prevPromise;
            await inputSequence(color);
            await delay(500);
        }, Promise.resolve());

        seqPlaying = false;

        replayButton.disabled = false;
    };
    
    /* inisates the game */
    const startGame = async () => {
        gameStarted = true;
        startButton.disabled = true;
        replayButton.disabled = false;

        console.log("Before API Call: ", gameSequence);

        await putGameState();

        console.log("After API Call: ", gameSequence);

        await delay(1000);
        await playSequence();
    };

    /* resets the game */
    const resetGame = async () => {
        gameSequence = [];
        userSequence = [];
        level = 1;

        modal.style.display = "none";
        startButton.disabled = false;
        replayButton.disabled = true;
        levelindicator.innerHTML = level;

        await putGameState();
    };

        console.log(gameSequence);

    /* My ears */
    startButton.addEventListener("click",startGame);
    replayButton.addEventListener("click",playSequence);
    resetButton.addEventListener("click", resetGame)
    /* event listener for if wrong sequence inputed and opens model window */
    document.addEventListener("wrong sequence", async (event) => {
        console.log(event.detail.message);
        gameStarted = false;
        modal.style.display = "flex";
    });
    /* event listener for next level to play next sequence when next level is reached */
    document.addEventListener("next level", async (event) => {
        console.log(event.detail.message);
        await delay(1500);
        await playSequence();
    });
    /* event listener for gamepad keyboard use */
    document.addEventListener("keydown", (event) => {
        if (!gameStarted || seqPlaying || inputOff)
            return;

        const key = event.key.toLowerCase();

        if (["q", "w", "a", "s"].includes(key)) {
            console.log(`key "${key}" is pressed.`);
            const inputEvent = new Event("click");
            inputMap[key].dispatchEvent(inputEvent);
        };
    });
});
