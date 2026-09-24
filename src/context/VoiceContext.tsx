import React, { createContext, useContext, useRef } from 'react'

import type { FunctionPropsType, FunctionsCustomTypes, systemType } from '../types'
import Action from '../components/Action'
import { useGeminiLive } from '../hooks/useGeminiLive'

type VoiceProviderProps = {
    children: React.ReactNode,
    apiKey: string,
    functions?: FunctionsCustomTypes,
    functionsProps?: FunctionPropsType | null,
    customB: boolean,
    systemInstruction: systemType
}

type VoiceContextValue = {
    buttonref: React.RefObject<HTMLButtonElement | null> | null,
    isConnected: boolean,
    isRecording: boolean,
    isModelSpeaking: boolean
}

const VoiceContext = createContext<VoiceContextValue>({
    buttonref: null,
    isConnected: false,
    isRecording: false,
    isModelSpeaking: false
})

// Keeps a render-time crash in the voice UI from taking down the host app.
class VoiceErrorBoundary extends React.Component<
    { children: React.ReactNode, fallback: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false }
    static getDerivedStateFromError() { return { hasError: true } }
    componentDidCatch(error: Error) {
        console.log(`there was an error with the app, ${error?.message}`)
    }
    render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

function VoiceInner({ systemInstruction, customB, children, apiKey, functions, functionsProps }: VoiceProviderProps) {
    const buttonref = useRef<HTMLButtonElement>(null)
    const { isConnected, isRecording, isModelSpeaking, startRecording, stopRecording } =
        useGeminiLive(systemInstruction || null as any, { apiKey }, functions || null, functionsProps || null)

    return (
        <VoiceContext.Provider value={{ buttonref, isConnected, isModelSpeaking, isRecording }}>
            <Action
                customB={customB}
                refbutton={buttonref}
                ismodelspeaking={isModelSpeaking}
                isdisable={isConnected}
                click={isRecording ? stopRecording : startRecording}
            />
            {children}
        </VoiceContext.Provider>
    )
}

export default function VoiceContextProvider(props: VoiceProviderProps) {
    return (
        <VoiceErrorBoundary fallback={<>{props.children}</>}>
            <VoiceInner {...props} />
        </VoiceErrorBoundary>
    )
}

export const useCustomButton = () => useContext(VoiceContext)
