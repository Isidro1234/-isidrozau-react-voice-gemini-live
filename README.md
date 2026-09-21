# React BVCS (Browser voice control system) With gemini

This library allows you to use gemini's live api to create your own ai assistant with few lines of code, it was created to leverage the power of gemini's live api to allow developers to create a voice control system for their websites, allowing a fluid web experience


# How to use?

This is a highly customizable library. 

you can install the library by runining:

npm install @isidrozau/react-bvcs

after the installation:

the package contain a main component context <VoiceContextProvider></VoiceContextProvider> which must be added on the root of your react project, passing with it your gemini api key. for security,
please make sure your api keys are safely added on the .env file and not exposed.

example 1 (simple react with Vite):
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import VoiceContextProvider from '../react@bvc/src/context/VoiceContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoiceContextProvider  apiKey={import.meta.env.VITE_PUBLIC_GEMINI_API_KEY}>
      <App />
    </VoiceContextProvider>
  </StrictMode>
)

example 2 (simple react with NextJs):


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return 
    <html suppressHydrationWarning
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body suppressHydrationWarning suppressContentEditableWarning>    
          <VoiceContextProvider  apiKey={import.meta.env.VITE_PUBLIC_GEMINI_API_KEY}>
         {
            children
         }
         </VoiceContextProvider>
       </body>
    </html>
  

after this you'll have access to set the customB property on VoiceContextProvider either to true or false.

the customB property gives you the ability to either create your own custom button to activate the 
assistant or to use the default button.

-   to use the default button set customB to false : customB={false}
-   Not to use the default button set customB to true : customB={true}

You can also define instructions for the voice assistant what it is able to do, it's name , etc.
by using the property: systemInstruction on the VoiceContextProvider component.



#  Function Calling

The library offers two tools 

-   native tools 
-   custom tools

native tools: come in with the library, you do not need anything else. You can just ask the ai assistant,

custom tools : you can passing your own function and either let the ai call it and pass arguments or just let the ai call it.

for custom tools, you can pass them in the VoiceContextProvider component with the following two
properties:

-   functions , 
-   functionsProps

functions : receives an array of objects containing a {func:Function, name:"name_of_the function" , withArgs:true}

func: receives a function
name: a name of a function separated by underscores
withArgs: receives a boolean value (true or false), specifies if the function receives arguments or not

for functionsProps: it receives an array of objects containing the properties of the function.

it receives a :
-   name
-   description
-   parameter : {
    -   type: "OBJECT"
    -   properties:{
        -   customArgument:{
            -   type: "OBJECT" | "NUMBER" | "STRING" | "BOOLEAN"
            -   description
        }
        
    }
}

the name of the function added on functions must match the name added on functionsProps.
meaning if you define a function called search on the functionProps you define the props for that function and the name must be exactly the same search.



