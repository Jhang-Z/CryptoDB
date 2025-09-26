// server0/main.cpp
#include <drogon/drogon.h>
#include <nlohmann/json.hpp>
#include <algorithm>
#include <string>
#include <mysql/mysql.h>
#include <sstream> 


#include "../fss/fss-common.h"
#include "../fss/fss-server.h"
#include "../fss/fss-client.h"

using namespace drogon;
using json = nlohmann::json;

// API: POST /compute_f0
// 请求体: { "a": <uint64_t>, "b": <uint64_t>, "i_val": <uint64_t> }
// 响应: { "f0": "<string representation of mpz_class>" }

int main() {
    // 设置监听地址和端口
    app().addListener("0.0.0.0", 8081);

    // 注册 POST 路由：/compute_f0
    app().registerHandler(
        "/compute_f0",
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
                    ServerKeyEq k0;

                    initializeClient(&fClient, 10, 2); // 根据实际情况调整参数
                    generateTreeEq(&fClient, &k0, nullptr, a, b); // 仅生成 k0

                   MYSQL* conn = mysql_init(nullptr);
                if (!conn) {
                    json err_json;
                    err_json["error"] = "MySQL init failed";
                    return err_json.dump();
                }

                if (!mysql_real_connect(conn, "127.0.0.1", "root", "123456", "test", 3306, nullptr, 0)) {
                    mysql_close(conn);
                    json err_json;
                    err_json["error"] = std::string("MySQL connect failed: ") + mysql_error(conn);
                    return err_json.dump();
                }

                std::string queryStr = "SELECT * FROM " + table; // 使用传入的表名生成查询语句
                if (mysql_query(conn, queryStr.c_str())) {
                    mysql_close(conn);
                    json err_json;
                    err_json["error"] = std::string("MySQL query failed: ") + mysql_error(conn);
                    return err_json.dump();
                }

                MYSQL_RES* result = mysql_store_result(conn);



                if (!result) {
                    mysql_close(conn);
                    json err_json;
                    err_json["error"] = "Failed to get result set";
                    return err_json.dump();
                }

                // mpz_class ans0 = 0, ans1 = 0;
                // unsigned long num_rows = mysql_num_rows(result);

                // 获取列元数据（列名、类型）
                MYSQL_FIELD* fields = mysql_fetch_fields(result);
                unsigned int num_cols = mysql_num_fields(result); // 总列数（包括 ID）

                // 动态计算每列结果
                std::map<std::string, std::pair<mpz_class, mpz_class>> column_results;
                unsigned long num_rows = mysql_num_rows(result);

                for (unsigned long i = 0; i < num_rows; ++i) {
                    MYSQL_ROW row = mysql_fetch_row(result);
                    if (!row) continue;

                    // 提取 ID 列（第 0 列）
                    uint64_t i_val = std::stoull(row[0]);

                    // 遍历其他列（第 0 列到最后一列）
                    for (unsigned int col_idx = 0; col_idx < num_cols; ++col_idx) {
                        const char* col_name = fields[col_idx].name;
                        std::string col_str = row[col_idx];
                        if (col_str.empty()) continue;

                        uint64_t col_val = std::stoull(col_str);
                        mpz_class f0 = evaluateEq(&fServer, &k0, i_val);
                        mpz_class f1 = evaluateEq(&fServer, &k1, i_val);

                        column_results[col_name].first += f0 * col_val;
                        column_results[col_name].second += f1 * col_val;
                    }
                }

                    // 后端返回的 JSON 格式示例：
                    //     {
                    //   "status": "success",
                    //   "table": "user_credit",
                    //   "columns": [
                    //     { "name": "credit_rank", "ans0": "12345", "ans1": "67890" },
                    //     { "name": "income", "ans0": "23456", "ans1": "78901" },
                    //     { "name": "age", "ans0": "34567", "ans1": "89012" }
                    //   ]
                    json j;
                    j["status"] = "success";
                    j["table"] = table;
                    json columns_array = json::array();
                    for (const auto& [col_name, vals] : column_results) {
                        columns_array.push_back({
                            {"name", col_name},
                            {"ans0", vals.first.get_str()},
                            {"ans1", vals.second.get_str()}
                        });
                    }
                    j["columns"] = columns_array;

                    if (result) mysql_free_result(result);
                    mysql_close(conn);

                    return j.dump();




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
            resp->setBody("✅ Server0 (k0) 已启动，请 POST 到 /compute_f0");
            resp->setContentTypeCode(ContentType::CT_TEXT_PLAIN);
            callback(resp);
        }
    );

    std::cout << "🚀 Server0 (k0) 运行在 http://localhost:8081" << std::endl;
    std::cout << "🔗 POST /compute_f0 {\"a\": <uint64_t>, \"b\": <uint64_t>, \"i_val\": <uint64_t>}" << std::endl;

    // 启动服务
    app().run();

    return 0;
}