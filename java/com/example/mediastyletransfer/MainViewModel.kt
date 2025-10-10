package com.example.mediastyletransfer

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.mediastyletransfer.api.backend.RetrofitClient
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream


data class UiState(
    val previewUri: Uri? = null,
    val isGenerateButtonEnabled: Boolean = false,
    val isLoading: Boolean = false,
    val loadingMessage: String = "",
    val resultBitmap: Bitmap? = null,
    val errorMessage: String? = null
)

class MainViewModel : ViewModel() {

    private val _uiState = MutableLiveData(UiState())
    val uiState: LiveData<UiState> = _uiState

    private var selectedBitmap: Bitmap? = null

    fun onMediaSelected(uri: Uri, contentResolver: ContentResolver) {
        try {
            val inputStream = contentResolver.openInputStream(uri)
            selectedBitmap = BitmapFactory.decodeStream(inputStream)

            _uiState.value = _uiState.value?.copy(
                previewUri = uri,
                isGenerateButtonEnabled = true,
                resultBitmap = null
            )
        } catch (e: Exception) {
            _uiState.value = _uiState.value?.copy(errorMessage = "Error al cargar el medio.")
        }
    }

    fun onGenerateClicked(style: String) {
        val imageToProcess = selectedBitmap ?: return

        _uiState.value = _uiState.value?.copy(
            isLoading = true,
            loadingMessage = "Preparando imagen...",
            isGenerateButtonEnabled = false
        )

        viewModelScope.launch {
            try {
                val stream = ByteArrayOutputStream()
                imageToProcess.compress(Bitmap.CompressFormat.JPEG, 90, stream)
                val imageBytes = stream.toByteArray()

                val imageRequestBody = imageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull(), 0, imageBytes.size)
                val imagePart = MultipartBody.Part.createFormData("image", "image.jpg", imageRequestBody)

                val styleRequestBody = style.toRequestBody("text/plain".toMediaTypeOrNull())

                _uiState.postValue(_uiState.value?.copy(loadingMessage = "Aplicando estilo..."))

                val response = RetrofitClient.apiService.stylizeImage(imagePart, styleRequestBody)

                val resultBytes = response.bytes()
                val resultBitmap = BitmapFactory.decodeByteArray(resultBytes, 0, resultBytes.size)

                _uiState.postValue(
                    _uiState.value?.copy(
                        isLoading = false,
                        resultBitmap = resultBitmap,
                        isGenerateButtonEnabled = true
                    )
                )

            } catch (e: Exception) {
                val errorType = e.javaClass.simpleName
                _uiState.postValue(
                    _uiState.value?.copy(
                        isLoading = false,
                        errorMessage = "Error [$errorType]: ${e.message}",
                        isGenerateButtonEnabled = true
                    )
                )
            }
        }
    }

    fun onErrorShown() {
        _uiState.value = _uiState.value?.copy(errorMessage = null)
    }
}
