// server1/main.cpp
#include <drogon/drogon.h>
#include <nlohmann/json.hpp>
#include <string>
#include <iostream>
#include <memory>
#include "../common/fss-common.h"
#include "../common/fss-server.h"

using namespace drogon;
using json = nlohmann::json;

// API: POST /compute_f1
// 请求体: { "a": <uint64_t>, "b": <uint64_t>, "i_val": <uint64_t> }
// 响应: { "f1": "<string representation of mpz_class>" }

int main() {
    // 设置监听地址和端口
    app().addListener("0.0.0.0", 8082);

    // 注册 POST 路由：/compute_f1
    app().registerHandler(
        "/compute_f1",
        [](const HttpRequestPtr& req,
           std::function<void(const HttpResponsePtr&)>&& callback) {
            // 处理 CORS 预检请求
            if (req->getMethod() == HttpMethod::Options) {
                auto resp = HttpResponse::newHttpResponse();
                resp->setStatusCode(k200OK);
                resp->addHeader("Access-Control-Allow-Origin", "*");
                resp->addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
                resp->addHeader("Access-Control-Allow-Headers", "Content-Type");
                callback(resp);
                return;
            }

            // 仅处理 POST
            if (req->getMethod() != HttpMethod::Post) {
                auto resp = HttpResponse::newHttpResponse();
                resp->setStatusCode(k405MethodNotAllowed);
                resp->setBody("Method Not Allowed: Only POST accepted");
                resp->setContentTypeCode(ContentType::CT_TEXT_PLAIN);
                callback(resp);
                return;
            }

            std::string responseText = "{\"error\": \"Invalid request\"}";

            try {
                std::string requestBody(req->getBody());
                json jsonData = json::parse(requestBody);

                if (jsonData.contains("a") && jsonData["a"].is_number_unsigned() &&
                    jsonData.contains("b") && jsonData["b"].is_number_unsigned() &&
                    jsonData.contains("i_val") && jsonData["i_val"].is_number_unsigned()) {
                    
                    uint64_t a = jsonData["a"].get<uint64_t>();
                    uint64_t b = jsonData["b"].get<uint64_t>();
                    uint64_t i_val = jsonData["i_val"].get<uint64_t>();

                    // 初始化 FSS 客户端
                    Fss fClient;
                    ServerKeyEq k1;

                    initializeClient(&fClient, 10, 2); // 根据实际情况调整参数
                    generateTreeEq(&fClient, nullptr, &k1, a, b); // 仅生成 k1

                    // 计算 f1(i_val)
                    mpz_class f1 = evaluateEq(&fClient, &k1, i_val);

                    // 构造返回的 JSON
                    json j;
                    j["f1"] = f1.get_str();

                    responseText = j.dump();
                } else {
                    json err_json;
                    err_json["error"] = "JSON 中缺少 'a', 'b' 或 'i_val' 字段，或不是无符号整数。请传入如：{\"a\": 10, \"b\": 2, \"i_val\": 1}";
                    responseText = err_json.dump();
                }
            } catch (const std::exception& e) {
                json err_json;
                err_json["error"] = std::string("后端异常: ") + e.what();
                responseText = err_json.dump();
            }

            // 返回 JSON 文本
            auto resp = HttpResponse::newHttpResponse();
            resp->setBody(responseText);
            resp->setContentTypeCode(ContentType::CT_APPLICATION_JSON); // 重要！告诉前端这是 JSON
            resp->addHeader("Access-Control-Allow-Origin", "*");
            callback(resp);
        },
        {HttpMethod::Post, HttpMethod::Options}
    );

    // 可选：根路径，测试服务是否启动
    app().registerHandler(
        "/",
        [](const HttpRequestPtr& req,
           std::function<void(const HttpResponsePtr&)>&& callback) {
            auto resp = HttpResponse::newHttpResponse();
            resp->setBody("✅ Server1 (k1) 已启动，请 POST 到 /compute_f1");
            resp->setContentTypeCode(ContentType::CT_TEXT_PLAIN);
            callback(resp);
        }
    );

    std::cout << "🚀 Server1 (k1) 运行在 http://localhost:8082" << std::endl;
    std::cout << "🔗 POST /compute_f1 {\"a\": <uint64_t>, \"b\": <uint64_t>, \"i_val\": <uint64_t>}" << std::endl;

    // 启动服务
    app().run();

    return 0;
}