import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db'

import {notFound,errorHandler} from './middleware/errorMiddleware';
import path from 'path';

import userRoutes from './routes/userRoutes';
import resourceRoutes from './routes/resourceRoutes'
const app=express();
dotenv.config();


app.use(express.json()); // to accept JSON Data


app.use('/api/user',userRoutes)
app.use('/api/resource',resourceRoutes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB(()=>{
    const server=app.listen(PORT,()=>{console.log(`Server Started on PORT ${PORT}`)});
});
 
                