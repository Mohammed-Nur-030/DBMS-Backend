import { init } from "./app";
const PORT=8000;

async function startApolloStart(){
    const app=await init();
    app.listen(PORT,()=>console.log(`Server Listening at Port ${PORT}`))
} 
startApolloStart();































