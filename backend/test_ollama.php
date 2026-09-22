<?php

$payload = json_encode([
    'model' => 'qwen3-14b-tools:latest',
    'prompt' => 'You are an expert CounterStrikeSharp C# plugin developer for Counter-Strike 2. Generate a custom, clean C# plugin based on this request: Create a VIP perk where players with @css/vip get +50 HP and a green chat message on round start. Return ONLY C# code.',
    'stream' => false
]);

$ch = curl_init('http://127.0.0.1:11434/api/generate');
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$result = curl_exec($ch);
if (curl_errno($ch)) {
    echo 'Curl error: ' . curl_error($ch);
} else {
    $json = json_decode($result, true);
    echo "=== REAL AI GENERATION VIA QWEN3-14B-TOOLS ===\n";
    echo $json['response'] ?? 'No response field';
}
curl_close($ch);
