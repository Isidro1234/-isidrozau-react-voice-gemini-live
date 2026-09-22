import fs from 'node:fs'
import path from "node:path"


export function ensureAndCreate(targetDir, filename , content){
    fs.mkdirSync(targetDir, {resolve:true})
    const filePath = path.join(targetDir , filename)
    fs.writeFileSync(filePath , content , 'utf-8')
    console.log(`✔ Added ${filename} to ${targetDir}`);
}