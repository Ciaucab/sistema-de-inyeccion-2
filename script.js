document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado correctamente');

    const questions = [
        {
            image: "https://www.dropbox.com/scl/fi/4q9y0gfqd6zm89v7lj2ml/41tAHzcY7XL._AC_SX522_.jpg?rlkey=blarofue9ls4sifq52t3pnrif&st=p18lbcn9&dl=1",
            question: "¿Cuál es el código de falla OBD II más común de la bomba de combustible?",
            options: [
                "P0087 ",
                "P0230 ",
                "P0627 ",
                "P0191 "
            ],
            correct: 1, // P0230
            feedback: "El código P0230 (Fallo en el circuito de la bomba de combustible) es uno de los más frecuentes. Revisa el relé y el mazo de cables."
        },
        {
            image: "https://www.dropbox.com/scl/fi/prtwkc8w32xtrmhz8fgth/93325238-BRUCK_6d428a9e-9b16-4cdf-800e-f5bbb5975691_1024x1024.jpg?rlkey=u1tstjps9mgloh2jvrozlcm98&st=r1wna2jg&dl=1",
            question: "¿Cuál es el código de falla OBD II más común en el inyector?",
            options: [
                "P0201 ",
                "P0300 ",
                "P0171 ",
                "P0261 "
            ],
            correct: 0, // P0201
            feedback: "El código P0201 indica un problema en el circuito del inyector del cilindro 1. Verifica la resistencia y las conexiones."
        }
    ];

    const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
    const CHARACTERISTIC_UUID = 'abcd1234-5678-1234-5678-123456789abc';

    let currentQuestionIndex = 0;
    let selectedOption = null;
    let answeredCorrectly = false;

    let bluetoothDevice;
    let bluetoothCharacteristic;
    let isBluetoothConnected = false;

    const startScreen = document.getElementById('start-screen');
    const quizContainer = document.getElementById('quiz-container');
    const finalScreen = document.getElementById('final-screen');
    const questionTitle = document.getElementById('question-title');
    const questionImage = document.getElementById('question-image');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const evaluarBtn = document.getElementById('evaluar-btn');
    const feedbackDiv = document.getElementById('feedback');
    const reintentarBtn = document.getElementById('reintentar-btn');
    const encenderBtn = document.getElementById('encender-prototipo-btn');
    const encenderStatus = document.getElementById('encender-status');
    const connectBluetoothBtn = document.getElementById('connect-bluetooth-btn');
    const bluetoothStatus = document.getElementById('bluetooth-status');

    function startQuiz() {
        startScreen.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        currentQuestionIndex = 0;
        loadQuestion(currentQuestionIndex);
    }

    function loadQuestion(index) {
        const q = questions[index];
        questionTitle.textContent = q.title;
        questionImage.src = q.image;
        questionText.textContent = q.question;

        optionsContainer.innerHTML = '';
        q.options.forEach((opt, i) => {
            const div = document.createElement('div');
            div.classList.add('option');
            div.textContent = opt;
            div.dataset.index = i;
            div.addEventListener('click', () => selectOption(i));
            optionsContainer.appendChild(div);
        });

        selectedOption = null;
        answeredCorrectly = false;
        feedbackDiv.classList.add('hidden');
        feedbackDiv.textContent = '';
        reintentarBtn.classList.add('hidden');
        evaluarBtn.disabled = false;
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    }

    function selectOption(index) {
        if (answeredCorrectly) return;
        selectedOption = index;
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector(`.option[data-index="${index}"]`).classList.add('selected');
    }

    function checkAnswer() {
        if (selectedOption === null) {
            alert('Por favor selecciona una opción.');
            return;
        }

        const q = questions[currentQuestionIndex];
        const isCorrect = (selectedOption === q.correct);

        if (isCorrect) {
            feedbackDiv.textContent = '¡Correcto! ' + q.feedback;
            feedbackDiv.className = 'feedback-correct';
            feedbackDiv.classList.remove('hidden');
            evaluarBtn.disabled = true;
            answeredCorrectly = true;

            setTimeout(() => {
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    loadQuestion(currentQuestionIndex);
                } else {
                    quizContainer.classList.add('hidden');
                    finalScreen.classList.remove('hidden');
                }
            }, 2000);
        } else {
            feedbackDiv.textContent = 'Incorrecto. ' + q.feedback;
            feedbackDiv.className = 'feedback-wrong';
            feedbackDiv.classList.remove('hidden');
            evaluarBtn.disabled = true;
            reintentarBtn.classList.remove('hidden');
        }
    }

    function reintentar() {
        selectedOption = null;
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        feedbackDiv.classList.add('hidden');
        evaluarBtn.disabled = false;
        reintentarBtn.classList.add('hidden');
    }

    async function connectToESP32() {
        if (!navigator.bluetooth) {
            updateBluetoothStatus('Web Bluetooth no soportado', 'disconnected');
            return;
        }

        try {
            updateBluetoothStatus('Escaneando...', 'disconnected');
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: [SERVICE_UUID] }],
                optionalServices: [SERVICE_UUID]
            });

            updateBluetoothStatus('Conectando...', 'disconnected');
            const server = await bluetoothDevice.gatt.connect();
            const service = await server.getPrimaryService(SERVICE_UUID);
            bluetoothCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

            isBluetoothConnected = true;
            updateBluetoothStatus('Conectado', 'connected');

            bluetoothDevice.addEventListener('gattserverdisconnected', () => {
                isBluetoothConnected = false;
                updateBluetoothStatus('Desconectado', 'disconnected');
            });

        } catch (error) {
            console.error('Error Bluetooth:', error);
            updateBluetoothStatus('Error: ' + error.message, 'disconnected');
        }
    }

    function updateBluetoothStatus(text, state) {
        bluetoothStatus.textContent = text;
        bluetoothStatus.className = 'bluetooth-status ' + state;
    }

    async function turnOnPrototype() {
        if (!isBluetoothConnected || !bluetoothCharacteristic) {
            encenderStatus.textContent = 'Conectando Bluetooth...';
            await connectToESP32();
            if (!isBluetoothConnected) {
                encenderStatus.textContent = 'No se pudo conectar.';
                return;
            }
        }

        try {
            const encoder = new TextEncoder();
            await bluetoothCharacteristic.writeValue(encoder.encode('ON'));
            encenderStatus.textContent = 'Prototipo encendido';
            encenderStatus.style.color = 'green';
        } catch (error) {
            console.error('Error al enviar comando:', error);
            encenderStatus.textContent = 'Error: ' + error.message;
            encenderStatus.style.color = 'red';
        }
    }

    connectBluetoothBtn.addEventListener('click', connectToESP32);
    document.getElementById('start-btn').addEventListener('click', startQuiz);
    evaluarBtn.addEventListener('click', checkAnswer);
    reintentarBtn.addEventListener('click', reintentar);
    encenderBtn.addEventListener('click', turnOnPrototype);

    console.log('Eventos asignados');
});