import { init } from "./app";

async function startApolloStart(){
    const app=await init();
    app.listen(8000,()=>console.log(`Server Listening at Port 8000`))
} 
startApolloStart();































