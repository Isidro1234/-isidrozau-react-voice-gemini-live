import React, { createContext, useContext, useRef } from 'react'

import type { FunctionPropsType, FunctionsCustomTypes, systemType } from '../types'
import Action from '../components/Action'
import { useGeminiLive } from '../hooks/useGeminiLive'

type VoiceContextType = {
    children:React.ReactNode,
    apiKey:string, 
    functions?: FunctionsCustomTypes,
    functionsProps?: FunctionPropsType | null ,
    customB:boolean ,
    systemInstruction: systemType
}
type refTypes = {
    buttonref: any,
    isConnected:any,
    isRecording:any, 
    isModelSpeaking:any
}

const VoiceContext = createContext<refTypes>({
    buttonref:null, 
    isConnected:null,
    isRecording:null,
    isModelSpeaking:null
})
export default function VoiceContextProvider({systemInstruction,  customB, children , apiKey , functions , functionsProps}:VoiceContextType) {
    const { isConnected, isRecording, isModelSpeaking, startRecording, stopRecording } = useGeminiLive(systemInstruction || null , {apiKey:apiKey}, functions || null , functionsProps || null)
    const buttonref = useRef<HTMLButtonElement>(null)
    return (
    <VoiceContext.Provider value={{buttonref, isConnected , isModelSpeaking , isRecording}}>
        <Action customB={customB} refbutton={buttonref} ismodelspeaking={isModelSpeaking} isdisable={isConnected} click={ isRecording ?  stopRecording  : startRecording}/>
        {children}
    </VoiceContext.Provider>
  )
}

export const useCustomButton = () => useContext(VoiceContext)
