package com.example.mediastyletransfer.api.backend

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

/**
 * Define la API de tu backend usando anotaciones de Retrofit.
 */
interface BackendApiService {

    /**
     * Envía una petición POST de tipo multipart/form-data al endpoint "/stylize".
     * Este formato es el adecuado para subir archivos.
     *
     * @param image La parte del formulario que contiene el archivo de imagen.
     * @param style La parte del formulario que contiene el texto del estilo.
     * @return La respuesta cruda del servidor (ResponseBody), que se espera que sea la imagen estilizada.
     */
    @Multipart
    @POST("stylize")
    suspend fun stylizeImage(
        @Part image: MultipartBody.Part,
        @Part("style") style: RequestBody
    ): ResponseBody
}
