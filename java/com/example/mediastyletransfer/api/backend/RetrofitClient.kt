package com.example.mediastyletransfer.api.backend

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Objeto singleton para crear y gestionar la instancia de Retrofit.
 */
object RetrofitClient {

    // URL del backend desplegado en Vercel.
    private const val BASE_URL = "https://caretos.vercel.com/"

    // Creamos una única instancia de Retrofit (lazy-initialized).
    private val retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create()) // Usamos Gson para convertir JSON
            .build()
    }

    // Exponemos una única instancia del servicio de la API.
    val apiService: BackendApiService by lazy {
        retrofit.create(BackendApiService::class.java)
    }
}
