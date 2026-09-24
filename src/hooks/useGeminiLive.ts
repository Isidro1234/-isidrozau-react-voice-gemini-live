import { useRef, useState, useCallback, useEffect } from "react";
import { apiKeyType, FunctionPropsType, FunctionsCustomTypes, systemType } from "../types";

// NOTE: verify this against Google's current Live API model list.
// A wrong name shows up as an immediate "Gemini WS closed" with a code.
const MODEL_NAME = "gemini-3.8-live";

const DEFAULT_INSTRUCTION =
  "You are Assistant called Moody, You have access to some tools that the user can request.";

const changeColor = {
  name: "Changing_Color",
  description: "Changes the UI's current color theme to the specified color.",
  parameters: {
    type: "OBJECT",
    properties: {
      color: {
        type: "STRING",
        description:
          "The color name to switch to, e.g. 'blue', 'red', 'green'. You can also return hexadecimal colors " +
          "or gradients written as CSS, e.g. 'linear-gradient(#ff0000, #0000ff)'.",
      },
    },
    required: ["color"],
  },
};

const go_to_website = {
  name: "go_to_website",
  description: "Allows users to navigate to websites",
  parameters: {
    type: "OBJECT",
    properties: {
      url: {
        type: "STRING",
        description: "The url of the website, e.g. https://google.com",
      },
    },
    required: ["url"],
  },
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Built-in tools, chosen by function name (not by guessing from the argument text).
async function runBuiltInTool(name: string, args: any) {
  if (name === "go_to_website") {
    const url = args?.url;
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return { status: "error", data: "invalid or missing url" };
    }
    window.location.href = url;
    return { status: "success", data: `navigating to ${url}` };
  }
  if (name === "Changing_Color") {
    const color = args?.color;
    if (typeof color !== "string") return { status: "error", data: "missing color" };
    document.body.style.background = color;
    return { status: "success", data: `background set to ${color}` };
  }
  return { status: "error", data: `unknown tool: ${name}` };
}

export function useGeminiLive(
  systemInst: systemType,
  ApiKey: apiKeyType,
  functionsC?: FunctionsCustomTypes | null,
  functionPropsC?: FunctionPropsType | null
) {
  const API_KEY = ApiKey.apiKey;
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  const wsRef = useRef<WebSocket | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [functions, setFunctionArray] = useState<FunctionsCustomTypes>(functionsC || null);
  const [functionProps, setFunctionProps] = useState<FunctionPropsType | null>(functionPropsC || null);

  // Refs so long-lived callbacks (connect runs once) always see the latest values.
  const functionsRef = useRef(functions);
  const functionPropsRef = useRef(functionProps);
  const instructionRef = useRef(DEFAULT_INSTRUCTION);
  functionsRef.current = functions;
  functionPropsRef.current = functionProps;
  instructionRef.current = systemInst?.systemInst || DEFAULT_INSTRUCTION;

  const getPlaybackContext = useCallback(() => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }, []);

  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    sourcesRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  const playPCMChunk = useCallback(
    (base64String: string) => {
      const ctx = getPlaybackContext();

      const binary = atob(base64String);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      sourcesRef.current.push(source);
      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((s) => s !== source);
      };

      // Schedule sequentially so chunks play back-to-back instead of overlapping.
      const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime);
      source.start(startAt);
      nextStartTimeRef.current = startAt + audioBuffer.duration;
    },
    [getPlaybackContext]
  );

  const customTool = useCallback(async (func: Function, args: any, withArgs: boolean) => {
    try {
      const data = withArgs ? await func(args) : await func();
      return { status: "success", data: data ?? null };
    } catch (error: any) {
      return { status: "error", data: error?.message ?? "tool failed" };
    }
  }, []);

  const handleToolCall = useCallback(
    async (calls: any[]) => {
      const functionResponses = [];
      for (const fc of calls) {
        let result: any;
        try {
          const res = functionsRef.current?.find((f: any) => f.name === fc.name);
          if (res) {
            result = await customTool(res.func, fc?.args, !!res.withArgs);
          } else {
            result = await runBuiltInTool(fc.name, fc.args || {});
          }
        } catch (error: any) {
          console.log(`Voice component: tool error, ${error?.message}`);
          result = { status: "error", data: error?.message };
        }
        functionResponses.push({ name: fc.name, id: fc.id, response: { result } });
      }

      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
      } else {
        console.log("Voice component: socket not open, tool response not sent");
      }
    },
    [customTool]
  );

  const connect = useCallback(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e: any) {
      console.log(`Voice component: could not connect, ${e?.message}`);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      const declarations = [...(functionPropsRef.current || []), go_to_website, changeColor];
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${MODEL_NAME}`,
            generationConfig: { responseModalities: ["AUDIO"] },
            tools: [{ functionDeclarations: declarations }],
            systemInstruction: { parts: [{ text: instructionRef.current }] },
          },
        })
      );
    };

    ws.onmessage = async (event: MessageEvent) => {
      try {
        const raw = typeof event.data === "string" ? event.data : await event.data.text();
        const response = JSON.parse(raw);

        if (response.setupComplete) {
          setIsConnected(true);
          return;
        }

        // User talked over the model: drop queued audio.
        if (response.serverContent?.interrupted) {
          stopPlayback();
          setIsModelSpeaking(false);
        }

        const parts = response.serverContent?.modelTurn?.parts;
        if (parts) {
          setIsModelSpeaking(true);
          for (const part of parts) {
            if (part.inlineData?.data) playPCMChunk(part.inlineData.data);
          }
        }

        if (response.serverContent?.turnComplete) {
          setIsModelSpeaking(false);
        }

        const functionCalls = response.toolCall?.functionCalls || [];
        if (functionCalls.length > 0) {
          handleToolCall(functionCalls);
        }
      } catch (error: any) {
        console.log(`Voice component: message error, ${error?.message}`);
      }
    };

    ws.onerror = () => console.log("Voice component: connection error, check your connection and API key");

    ws.onclose = (event: CloseEvent) => {
      if (wsRef.current !== ws) return; // stale socket (StrictMode / unmount)
      console.log("Voice component: connection closed", event.code, event.reason);
      setIsConnected(false);
    };
  }, [WS_URL, playPCMChunk, handleToolCall, stopPlayback]);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            data: arrayBufferToBase64(chunk),
            mimeType: "audio/pcm;rate=16000",
          },
        },
      })
    );
  }, []);

  const startRecording = useCallback(async () => {
    if (micContextRef.current) return; // already recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const micContext = new AudioContext({ sampleRate: 16000 });
      micContextRef.current = micContext;

      // audio-processor.js must live in your app's public/ folder.
      await micContext.audioWorklet.addModule("/audio-processor.js");

      const source = micContext.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(micContext, "pcm-processor");
      micSourceRef.current = source;
      processorRef.current = processor;

      processor.port.onmessage = (event) => sendAudioChunk(event.data);

      // Intentionally NOT connected to destination: that would echo the mic to the speakers.
      source.connect(processor);

      // Unlock playback while we're inside a user gesture.
      getPlaybackContext();

      setIsRecording(true);
    } catch (e: any) {
      console.log(`Voice component: could not start recording, ${e?.message}`);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      micContextRef.current?.close().catch(() => {});
      streamRef.current = null;
      micContextRef.current = null;
      setIsRecording(false);
    }
  }, [sendAudioChunk, getPlaybackContext]);

  const stopRecording = useCallback(() => {
    try {
      micSourceRef.current?.disconnect();
      processorRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      micContextRef.current?.close().catch(() => {});

      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      }
    } catch (e: any) {
      console.log(`Voice component: error stopping recording, ${e?.message}`);
    }
    micSourceRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    micContextRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      const ws = wsRef.current;
      wsRef.current = null; // makes the stale-socket guard ignore this close
      ws?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      micContextRef.current?.close().catch(() => {});
      playbackContextRef.current?.close().catch(() => {});
      playbackContextRef.current = null;
      micContextRef.current = null;
      sourcesRef.current = [];
      nextStartTimeRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    functionProps,
    setFunctionProps,
    isRecording,
    isModelSpeaking,
    startRecording,
    stopRecording,
    functions,
    setFunctionArray,
  };
}
