import React, { useRef } from 'react'

export default function Action({click , isdisable , ismodelspeaking, refbutton, customB}:
    {customB:boolean ,click?:Function | null, isdisable:boolean , ismodelspeaking:boolean, refbutton:any}) {

  return (
    <button  ref={refbutton} 
    style={{position:'absolute', zIndex:1000, cursor:'pointer', border:'none', color:'white', opacity:customB ? 0: 1,  top:50, left:10, padding:10, borderRadius:50, background:'blue'}} 
    disabled={!isdisable} onClick={()=>{click ? click() : null}}>
        {ismodelspeaking && "model speaking..."}
        start talking
    </button>
  )
}
