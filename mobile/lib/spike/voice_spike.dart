import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:vosk_flutter/vosk_flutter.dart';

// Phase-4 voice prototype, preserved from the original main.dart. Reached from
// the home screen so the Vosk + flutter_tts work isn't lost while the app shell
// is built out. Not yet wired into Cook Mode.

/// Cooking command grammar. Constraining Vosk to just these phrases is the
/// noise-rejection trick: anything outside this vocabulary is ignored, which is
/// exactly what we want in a loud kitchen. "[unk]" lets Vosk bucket unknowns.
const List<String> kGrammar = [
  'next',
  'next step',
  'back',
  'go back',
  'previous',
  'repeat',
  'say that again',
  'ingredients',
  'how many steps',
  'how much butter',
  'how much sugar',
  'start timer',
  'stop',
  // Step jumping: "go to step three", "step five", or just "three".
  'go to step',
  'step',
  'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
  '[unk]',
];

const Map<String, int> kNumberWords = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
};

class VoiceSpikePage extends StatefulWidget {
  const VoiceSpikePage({super.key});
  @override
  State<VoiceSpikePage> createState() => _VoiceSpikePageState();
}

class _VoiceSpikePageState extends State<VoiceSpikePage> {
  final _vosk = VoskFlutterPlugin.instance();
  final _modelLoader = ModelLoader();
  final _tts = FlutterTts();

  SpeechService? _speech;
  String _status = 'Tap Start to load model';
  String _partial = '';
  final List<String> _log = [];
  bool _listening = false;
  bool _busy = false;

  // Fake recipe state so we can see commands actually drive something.
  int _step = 1;
  final int _totalSteps = 6;

  @override
  void initState() {
    super.initState();
    _tts.setSpeechRate(0.45); // ~native slow, clearer for cooking
    _tts.awaitSpeakCompletion(true); // so _say() awaits until speech finishes
  }

  /// Build the model + recognizer + mic service exactly once. The Vosk plugin
  /// keeps a single native speech-service instance and throws "already exists"
  /// if initSpeechService runs twice, so Start/Stop must reuse this one.
  Future<void> _ensureInitialized() async {
    if (_speech != null) return;

    setState(() => _status = 'Loading Vosk model…');
    final modelPath = await _modelLoader
        .loadFromAssets('assets/models/vosk-model-small-en-us-0.15.zip');
    final model = await _vosk.createModel(modelPath);

    final recognizer = await _vosk.createRecognizer(
      model: model,
      sampleRate: 16000,
      grammar: kGrammar,
    );

    _speech = await _vosk.initSpeechService(recognizer);
    _speech!.onPartial().listen(_onPartial);
    _speech!.onResult().listen(_onResult);
  }

  Future<void> _start() async {
    if (_busy || _listening) return;
    setState(() => _busy = true);
    try {
      final mic = await Permission.microphone.request();
      if (!mic.isGranted) {
        setState(() => _status = 'Microphone permission denied');
        return;
      }

      await _ensureInitialized();
      await _speech!.start();

      setState(() {
        _listening = true;
        _status = 'Listening — try "next", "back", "how much butter"';
      });
      await _say('Voice ready. What would you like to do?');
    } catch (e) {
      setState(() => _status = 'Error: $e');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _stop() async {
    await _speech?.stop();
    setState(() {
      _listening = false;
      _status = 'Stopped';
      _partial = '';
    });
  }

  void _onPartial(String json) {
    final text = (jsonDecode(json)['partial'] as String?)?.trim() ?? '';
    setState(() => _partial = text);
  }

  void _onResult(String json) {
    final text = (jsonDecode(json)['text'] as String?)?.trim() ?? '';
    if (text.isEmpty) return;
    setState(() {
      _partial = '';
      _log.insert(0, '🗣  $text');
    });
    _handleCommand(text);
  }

  void _handleCommand(String text) {
    String reply;
    // Step jump: any number word wins first ("go to step three", "three").
    final numHit = kNumberWords.entries.firstWhere(
      (e) => RegExp('\\b${e.key}\\b').hasMatch(text),
      orElse: () => const MapEntry('', -1),
    );
    if (numHit.value > 0) {
      _step = numHit.value.clamp(1, _totalSteps);
      reply = 'Going to step $_step of $_totalSteps.';
    } else if (text.contains('next')) {
      _step = (_step < _totalSteps) ? _step + 1 : _step;
      reply = 'Step $_step of $_totalSteps.';
    } else if (text.contains('back') || text.contains('previous')) {
      _step = (_step > 1) ? _step - 1 : _step;
      reply = 'Step $_step of $_totalSteps.';
    } else if (text.contains('repeat') || text.contains('again')) {
      reply = 'Repeating step $_step.';
    } else if (text.contains('how many')) {
      reply = 'There are $_totalSteps steps.';
    } else if (text.contains('ingredients')) {
      reply = 'Butter, sugar, flour, and chocolate chips.';
    } else if (text.contains('butter')) {
      reply = 'You need one cup of butter.';
    } else if (text.contains('sugar')) {
      reply = 'You need three quarters of a cup of sugar.';
    } else if (text.contains('timer')) {
      reply = 'Timer started.';
    } else if (text.contains('stop')) {
      reply = 'Stopping.';
    } else {
      return; // unrecognized — stay silent
    }
    setState(() => _log.insert(0, '🤖  $reply'));
    _say(reply);
  }

  Future<void> _say(String text) async {
    // Echo guard: pause recognition while we speak so the mic doesn't hear our
    // own TTS and trigger a feedback loop. Reset clears any buffered audio tail
    // before we resume listening.
    await _speech?.setPause(paused: true);
    await _tts.stop();
    await _tts.speak(text); // awaits completion (awaitSpeakCompletion = true)
    await Future.delayed(const Duration(milliseconds: 350));
    await _speech?.reset();
    await _speech?.setPause(paused: false);
  }

  @override
  void dispose() {
    _speech?.dispose();
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vosk Voice Spike')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text('Cooking step $_step / $_totalSteps',
                        style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    Text(_status, textAlign: TextAlign.center),
                    if (_partial.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('… $_partial',
                          style: const TextStyle(
                              fontStyle: FontStyle.italic, color: Colors.grey)),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _busy || _listening ? null : _start,
                    icon: const Icon(Icons.mic),
                    label: const Text('Start'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _listening ? _stop : null,
                    icon: const Icon(Icons.stop),
                    label: const Text('Stop'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(),
            const Text('Transcript',
                style: TextStyle(fontWeight: FontWeight.bold)),
            Expanded(
              child: ListView.builder(
                itemCount: _log.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(_log[i]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
