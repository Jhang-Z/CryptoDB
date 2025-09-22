#include <iostream>
#include <string>
#include <vector>
#include <cstring>
#include <stdexcept>

// ======================
// 引入 GmSSL 的 SM4 C 接口
// ======================
extern "C" {
#include <sm4.h>
}

// ======================
// Base64 编码函数（如果 GmSSL 未提供，用这个）
// ======================
static const std::string base64_chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

std::string base64_encode(const std::vector<unsigned char>& bytes) {
    std::string encoded;
    int val = 0, valb = -6;
    for (unsigned char c : bytes) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            encoded.push_back(base64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) {
        encoded.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    while (encoded.size() % 4) {
        encoded.push_back('=');
    }
    return encoded;
}

// ======================
// SM4-CBC 加密函数（使用 SM4_ECB + 手动 CBC 模式）
// ======================
std::string sm4_encrypt(const std::string& plaintext, const std::string& key, const std::string& iv) {
    if (key.size() != 16) throw std::runtime_error("SM4 密钥必须是 16 字节（128 bit）");
    if (iv.size() != 16)  throw std::runtime_error("SM4 IV 必须是 16 字节");

    SM4_CTX ctx;
    sm4_set_key(&ctx, reinterpret_cast<const unsigned char*>(key.data()), SM4_ENCRYPT);

    const size_t block_size = 16;
    size_t plaintext_len = plaintext.size();

    // PKCS#7 填充
    size_t pad_len = block_size - (plaintext_len % block_size);
    size_t padded_len = plaintext_len + pad_len;
    std::vector<unsigned char> padded(padded_len, 0);
    memcpy(padded.data(), plaintext.data(), plaintext_len);
    for (size_t i = 0; i < pad_len; ++i) {
        padded[plaintext_len + i] = static_cast<unsigned char>(pad_len);
    }

    std::vector<unsigned char> ciphertext(padded_len);
    std::vector<unsigned char> previous_block(iv.begin(), iv.end()); // 初始为 IV

    for (size_t i = 0; i < padded_len; i += block_size) {
        // 当前块与前一个密文块（或 IV）异或
        std::vector<unsigned char> block(block_size);
        for (size_t j = 0; j < block_size; ++j) {
            block[j] = padded[i + j] ^ previous_block[j];
        }

        // 调用 SM4 加密（ECB 模式）
        unsigned char encrypted_block[block_size];
        sm4_crypt_ecb(&ctx, SM4_ENCRYPT, block_size, encrypted_block, block.data());

        // 保存密文
        for (size_t j = 0; j < block_size; ++j) {
            ciphertext[i + j] = encrypted_block[j];
        }

        // 更新 previous_block 为当前密文块（用于下一块异或）
        previous_block.assign(encrypted_block, encrypted_block + block_size);
    }

    // 返回 Base64 编码的密文
    return base64_encode(ciphertext);
}

int main() {
    std::string plaintext = "VIP";           // 比如数据库字段：信用等级
    std::string key = "0123456789abcdef";     // 16 字节 SM4 密钥
    std::string iv  = "1234567890abcdef";     // 16 字节 IV

    try {
        std::string encrypted = sm4_encrypt(plaintext, key, iv);
        std::cout << "🔐 SM4 加密结果（Base64）: " << encrypted << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "❌ SM4 加密失败: " << e.what() << std::endl;
    }

    return 0;
}