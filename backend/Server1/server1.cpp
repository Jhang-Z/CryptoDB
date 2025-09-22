#include <drogon/drogon.h>
#include <nlohmann/json.hpp>
#include <algorithm>
#include <string>
#include <mysql/mysql.h>
#include <sstream> 

#include <chrono>
#include "fss-common.h"
#include "fss-server.h"
#include "fss-client.h"


using namespace drogon;
using json = nlohmann::json;


// 计算 FSS 结果，并以 JSON 格式返回 ans0 和 ans1
std::string compute_fss_results(const std::string& input_str, const std::string& table) {
    uint64_t a = 0;
    try {
        a = std::stoull(input_str); // 转成 uint64_t
    } catch (...) {
        json err_json;
        err_json["error"] = "输入的 query 必须是正整数";
        return err_json.dump(); // 返回 JSON 格式错误
    }

    uint64_t b = 1;
    Fss fClient, fServer;
    ServerKeyEq k0;
    ServerKeyEq k1;

    initializeClient(&fClient, 10, 2);
    generateTreeEq(&fClient, &k0, &k1, a, b);
    initializeServer(&fServer, &fClient);

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
}


    // for (unsigned long i = 0; i < num_rows; ++i) {
    //     MYSQL_ROW row = mysql_fetch_row(result);
    //     if (!row || !row[0]) continue;

    //     std::string id_str = row[0];
    //     uint64_t i_val = 0;
    //     try {
    //         i_val = std::stoull(id_str);
    //     } catch (...) {
    //         std::cerr << "⚠️ 跳过无效ID: " << id_str << std::endl;
    //         continue;
    //     }

    //     ans0 += evaluateEq(&fServer, &k0, i_val)*i_val;
    //     ans1 += evaluateEq(&fServer, &k1, i_val)*i_val;
    // }

    // if (result) mysql_free_result(result);
    // mysql_close(conn);

    // // 构造返回的 JSON
    // json j;
    // j["ans0"] = ans0.get_str();
    // j["ans1"] = ans1.get_str();
    // j["status"] = "success";

    // return j.dump(); // 转为字符串返回

    







int main() {
    // 设置监听地址和端口
    app().addListener("0.0.0.0", 8080);

    app().registerHandler("/api", [](const drogon::HttpRequestPtr& req,
                                         std::function<void (const drogon::HttpResponsePtr&)>&& callback) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setBody("Hello, Drogon!");
        callback(resp);
    });


    // ✅ 注册 POST 路由：/api/secureQuery
    app().registerHandler(
    "/api/secureQuery",
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

        std::string responseText = "❌ 未能处理请求";

        try {
            std::string requestBody(req->getBody());
            json jsonData = json::parse(requestBody);

            if (jsonData.contains("query") && jsonData["query"].is_string() &&
                    jsonData.contains("table") && jsonData["table"].is_string()) { // 检查是否包含表名
                    std::string userInput = jsonData["query"].get<std::string>();
                    std::string table = jsonData["table"].get<std::string>(); // 获取表名
                    std::cout << "🔍 用户输入: " << userInput << std::endl;
                    std::cout << "📋 选择的表: " << table << std::endl;

                    // 调用核心函数，得到 JSON 格式的 ans0 和 ans1
                    responseText = compute_fss_results(userInput, table); // 传递表名

            } else {
                json err_json;
                err_json["error"] = "JSON 中缺少 'query' 字段，或不是字符串。请传入如：{\"query\": \"5\"}";
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
            resp->setBody("✅ Drogon 1.9 服务已启动，请 POST 到 /api/secureQuery");
            resp->setContentTypeCode(ContentType::CT_TEXT_PLAIN);
            callback(resp);
        }
    );

    std::cout << "🚀 Drogon 1.9 服务器运行在 http://localhost:8080" << std::endl;
    std::cout << "🔗 POST /api/secureQuery {\"query\":\"xxx\"}" << std::endl;

    // 启动服务
    app().run();

    return 0;
}