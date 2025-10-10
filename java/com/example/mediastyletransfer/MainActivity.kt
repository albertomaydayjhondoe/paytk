package com.example.mediastyletransfer

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.isVisible
import com.bumptech.glide.Glide
import com.example.mediastyletransfer.databinding.ActivityMainBinding
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: MainViewModel by viewModels()

    private var tempImageUri: Uri? = null

    private val requestPermissionsLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            // Después de que el usuario responde, verificamos el permiso de la cámara de nuevo
            if (permissions[Manifest.permission.CAMERA] == true) {
                binding.btnCamera.isEnabled = true
            } else {
                binding.btnCamera.isEnabled = false
                Toast.makeText(this, "Permiso de cámara denegado. El botón de la cámara está desactivado.", Toast.LENGTH_LONG).show()
            }
        }

    private val selectMediaLauncher =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
            uri?.let {
                viewModel.onMediaSelected(it, contentResolver)
            }
        }

    private val takePictureLauncher =
        registerForActivityResult(ActivityResultContracts.TakePicture()) { success: Boolean ->
            if (success) {
                tempImageUri?.let {
                    viewModel.onMediaSelected(it, contentResolver)
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Desactivamos el botón de la cámara al inicio
        binding.btnCamera.isEnabled = false

        askForPermissions()
        setupUI()
        observeViewModel()
    }

    private fun askForPermissions() {
        val permissionsToRequest = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.READ_MEDIA_IMAGES
        )

        // Verificamos si ya tenemos el permiso de la cámara
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            binding.btnCamera.isEnabled = true
        } else {
            // Si no lo tenemos, lo pedimos
            requestPermissionsLauncher.launch(permissionsToRequest)
        }
    }

    private fun setupUI() {
        val styles = resources.getStringArray(R.array.art_styles)
        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, styles)
        binding.styleSpinner.setAdapter(adapter)

        binding.btnUpload.setOnClickListener {
            selectMediaLauncher.launch("image/*")
        }

        binding.btnCamera.setOnClickListener {
            getTmpFileUri().let {
                tempImageUri = it
                takePictureLauncher.launch(it)
            }
        }

        binding.btnGenerate.setOnClickListener {
            val selectedStyle = binding.styleSpinner.text.toString()
            if (selectedStyle.isBlank()) {
                Toast.makeText(this, "Por favor, selecciona un estilo.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            viewModel.onGenerateClicked(selectedStyle)
        }
    }

    private fun getTmpFileUri(): Uri {
        val tmpFile = File.createTempFile("tmp_image_file", ".png", externalCacheDir).apply {
            createNewFile()
            deleteOnExit()
        }

        return FileProvider.getUriForFile(applicationContext, "com.example.mediastyletransfer.provider", tmpFile)
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(this) { state ->
            binding.btnGenerate.isEnabled = state.isGenerateButtonEnabled
            binding.loaderContainer.isVisible = state.isLoading
            binding.loaderText.text = state.loadingMessage

            if (state.resultBitmap != null) {
                Glide.with(this).load(state.resultBitmap).into(binding.previewImage)
            } else if (state.previewUri != null) {
                Glide.with(this).load(state.previewUri).into(binding.previewImage)
            }

            state.errorMessage?.let {
                Toast.makeText(this, it, Toast.LENGTH_LONG).show()
                viewModel.onErrorShown()
            }
        }
    }
}