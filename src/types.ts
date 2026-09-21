export type mainType = "OBJECT"
export type secondTypes = "STRING" | "NUMBER" | "OBJECT" | "BOOLEAN"
export type parametersType = {
    type:mainType
} & {
  properties: {
    [key:string] :{
    type:secondTypes , 
    description:string
  } | mainType
}
}
export type FunctionPropsType = 
  Array<{name:string,
    description:string, parameters:parametersType

  }> | string

export type apiKeyType = {
    apiKey:string
}
export type FunctionsCustomTypes = Array<{func:Function , name:string , withArgs:boolean}> | null

export type systemType = {
  systemInst?:string | null
}
