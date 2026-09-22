# @isidrozau/react-voice-gemini-live-realtime
<img width="1280" height="720" alt="@isidrozau" src="https://github.com/user-attachments/assets/ea0dcdc9-586a-4a24-8781-6b581de4c18e" />

This library allows you to add gemini live api to your application and create your own ai assistant system with access to native and custom tools. Some native tools include the ability to navigate to different websites and changing the background color.

# How to use?
This library is highly customizable, allowing you to add your own custom tools, customize the activation button , etc.

# Installation 
You can download the package on npm using the command below :
<h2><kbd>npm i @isidrozau/react-voice-gemini-live-realtime</kbd></h2>
<p>using the </p>
<kbd><VoiceContextProvider/></kbd>
<img width="679" height="239" alt="photo2" src="https://github.com/user-attachments/assets/4fde0d24-0c9c-4102-ba18-f5fcbc633d43" />

After installation to pass in the apiKey (import it from .env for safety) on the <kbd><VoiceContextProvider  apikey="YOUR_API_KEY"/></kbd> 
You can also pass in the system instruction for the assistant, if not passed the system uses a default instruction. 
 <p><kbd><VoiceContextProvider systemInstruction={{systemInst:'Your instructions'}}  apikey="YOUR_API_KEY"/></kbd>  </p>

# customB
  <p>The library comes with a default button for activating the voice-assistant, you can set it on by setting of <kbd><VoiceContextProvider/></kbd> to the property </p>  <p><kbd>customB={true}</kbd> </p>
 <img width="679" height="239" alt="photo2" src="https://github.com/user-attachments/assets/801b2ba8-0aaf-4568-8ec9-9cfbe56a6e62" />

 # Functions and FunctionProps
 <p>These two parameters are sent to the useGeminiLive() hook </p>
 <img width="418" height="124" alt="photo4" src="https://github.com/user-attachments/assets/218d5f6a-8e19-4ae8-b374-c4fcb8dd8d20" />


 # Functions
 <p> it accepts an array of functions with a name, and withArgs  </p>
<img width="482" height="53" alt="photo5" src="https://github.com/user-attachments/assets/32cc3dde-12ab-472c-9dae-c7b6a70fa055" />
<img width="418" height="124" alt="photo4" src="https://github.com/user-attachments/assets/a5f515a3-fb0e-4298-9a60-4b64cc395424" />



 # FunctionProps
<p> it accepts an array of properties of the specific function  </p>
<img width="770" height="218" alt="photo3" src="https://github.com/user-attachments/assets/1e7d9cee-5130-4d3a-9193-376e8f0b66ac" />
<img width="418" height="124" alt="photo4" src="https://github.com/user-attachments/assets/c6b1e487-59ee-402d-a3eb-fa9d66f0f7c7" />

thank you for using our api




