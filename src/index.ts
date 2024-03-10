const dotenv= require('dotenv')
import { init } from "./app";

dotenv.config();

const PORT=8000;
async function startApolloStart(){
    const app=await init();
    app.listen(PORT,()=>console.log(`Server Listening at Port ${PORT}`))
} 
startApolloStart();































