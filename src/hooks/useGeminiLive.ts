import { useRef, useState, useCallback, useEffect } from "react";
import { apiKeyType, FunctionPropsType, FunctionsCustomTypes, systemType } from "../types";


function arrayBufferToBase64(buffer:any) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}


export function useGeminiLive(systemInst:systemType , ApiKey:apiKeyType, functionsC?:FunctionsCustomTypes | null, functionPropsC?:FunctionPropsType | null) {
  
  const API_KEY = ApiKey.apiKey;
  const MODEL_NAME = "gemini-3.8-live";
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  const wsRef:any = useRef(null);
  const micContextRef:any = useRef(null);
  const playbackContextRef:any = useRef(null);
  const nextStartTimeRef:any = useRef(0);
  const streamRef:any = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [functions, setFunctionArray] = useState<FunctionsCustomTypes>(functionsC || null)
  const [functionProps, setFunctionProps] = useState< FunctionPropsType | null>(functionPropsC || null)
  const getPlaybackContext = useCallback(() => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return playbackContextRef.current;
  }, []);

  const playPCMChunk = useCallback(
    (base64String:any) => {
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

      // Schedule sequentially so chunks play back-to-back instead of overlapping.
      const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime);
      source.start(startAt);
      nextStartTimeRef.current = startAt + audioBuffer.duration;
    },
    [getPlaybackContext]
  );
const changeColor = {
    name: 'Changing_Color',
    description: "Changes the UI's current color theme to the specified color.",
    parameters: {
      type: "OBJECT",
      properties: {
        color: {
          type: "STRING",
          description: `The color name to switch to, e.g. 'blue', 'red', 'green'. you can also return hexadecimal colors or gradient combinations, 
          the gradient combinations should be in hexadecimal pattern like`,
        },
      },
      required: ["color"],
    },
  }

  const go_to_website = {
    name: 'go_to_website',
    description: "Allows users to navegate to websites",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description: `The url of the website eg. https://google.com.`,
        },
      },
      required: ["url"],
    },
  }
 const tools = functionProps ? [{functionDeclarations:[...functionProps, go_to_website,  changeColor]}] : [{functionDeclarations:[go_to_website, changeColor]}]
 
  

    const myTool = useCallback(async(args:any) => {
    const args_correct = args?.color ?? args?.url;
    if(args_correct.includes('http')){
      window.location.href = `${args_correct}`
      return { status: "success", data: "some result" };
    }else{
      document.body.style.background =`${args?.color}`
      return { status: "success", data: "some result" };
    }
  }, []);
 
  const customTool = useCallback(async(func:Function , args:any, withArgs:boolean)=>{
    try {
      if(withArgs){
        await func(args)
      }else{
        await func()
      }
      return {status:"success", data:"some result"}
    } catch (error) {
      return { status: "error", data: "some result" };
    }
  }, [])
 
  const handleToolCall = useCallback(async(calls:any) => {
    const functionResponses = [];
    for (const fc of calls) {
      let result;
      try {
        const res = functions?.find((f)=> f.name === fc.name)
        if(res){
          if(res.withArgs){
            result = await customTool(res?.func , fc?.args , res.withArgs)
          }else{
             result = await customTool(res?.func , fc?.args, false)
          }
           
        }else{
           result = await myTool(fc.args || {});
        }
      } catch (error:any) {
        console.error(error);
        result = { error: error?.message };
      }
 
      functionResponses.push({
        name: fc.name,
        id: fc.id,
        response: { result },
      });
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          toolResponse: { functionResponses },
        })
      );
      console.log("Sent tool response");
    } else {
      console.warn("WebSocket not open to send tool response.");
    }
  }, [myTool]);
  const instruction = systemInst.systemInst || `You are Assistant called Moody, You have access to some tools that the user can request.`
 const connect = useCallback(() => {
    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch (e: any) {
      console.log(`Voice component: could not connect, ${e?.message}`)
      return
    }
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          setup: {
  model: `models/${MODEL_NAME}`,
  generationConfig: {
    responseModalities: ["AUDIO"],
  },
  tools:tools,
  systemInstruction: { parts: [{ text: instruction }] }
}
        })
      );
    };
 
    ws.onmessage = async (event:any) => {
      try{
      
         const raw = typeof event.data === "string" ? event.data : await event.data.text();
      const response = JSON.parse(raw);
 
      if (response.setupComplete) {
        setIsConnected(true);
        return;
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

      const functionCalls = response.toolCall?.functionCalls || []
      if (functionCalls.length > 0) {
        handleToolCall(functionCalls)
      }
      }catch(error:any){
          console.log(`Voice component: message error, ${e?.message}`)
      }
    };

     ws.onerror = (err:any) => console.error("Gemini WS error:", err);
      ws.onclose = (event:any) => {
      console.log("Gemini WS closed:", event.code, event.reason);
      setIsConnected(false);
      };
       console.log('connection error: check connection')
  }, [playPCMChunk, handleToolCall]);
  const sendAudioChunk = useCallback((chunk:any) => {
    const ws:any = wsRef.current;
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

    processor.port.onmessage = (event) => sendAudioChunk(event.data);

    // Intentionally NOT connected to micContext.destination — that would echo your own mic to speakers.
    source.connect(processor);

    setIsRecording(true);
  }, [sendAudioChunk]);

  const stopRecording = useCallback(() => {
    streamRef.current?.getTracks().forEach((track:any) => track.stop());
    micContextRef.current?.close();
    micContextRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      micContextRef.current?.close();
      playbackContextRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isConnected, functionProps, setFunctionProps , isRecording, isModelSpeaking, startRecording, stopRecording , functions , setFunctionArray };
}
