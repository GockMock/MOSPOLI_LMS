# Models

Place the embedding GGUF model here before running `docker-compose.ai.yml`:

```text
models/qwen3-embedding-4b-q5_k_m.gguf
```

Required quantization: `Q5_K_M`.

Preferred family: `Qwen3-Embedding-4B GGUF Q5_K_M`.

The compose file keeps the model outside the container and mounts this folder read-only into `llama-embedding-server`.
