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
Fss fClient, fServer;
ServerKeyEq k0;
ServerKeyEq k1;
ServerKeyLt lt_k0r;
ServerKeyLt lt_k1r;
ServerKeyLt lt_k0l;
ServerKeyLt lt_k1l;


std::map<std::string, std::vector<mpz_class>> g_ans0_data_for_8081;  // 存储每列的ans0数据（每行一个值）
std::map<std::string, std::vector<mpz_class>> g_ans1_data_for_8082;  // 存储每列的ans1数据（每行一个值）


std::vector<std::string> split(const std::string &s, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(s);
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    return tokens;
}
int findColumnIndexByName(MYSQL_FIELD* fields, unsigned int num_cols, const std::string& target_column) {
    for (unsigned int col_idx = 0; col_idx < num_cols; ++col_idx) {
        const char* col_name = fields[col_idx].name;
        if (col_name && std::string(col_name) == target_column) {
            return col_idx;
        }
    }
    return -1; // 未找到
}

// 计算 DPF 结果，并以 JSON 格式返回 ans0 和 ans1
std::string compute_dcf_results(const std::string& input_str, const std::string& table, const std::string& column) {
    std::vector<std::string> parts = split(input_str, ',');
    
    
    uint64_t a1 = 0, a2 = 0;
    if (parts.size() != 2) {
        json err_json;
        err_json["error"] = "输入的 query 必须是两个正整数,用逗号分隔,例如:4,6";
        return err_json.dump();
    }

    a1 = std::stoull(parts[0]);
    a2 = std::stoull(parts[1]);

    uint64_t b = 1;
   
    cout << "a1:" << a1 <<"a2:"<<  a2 <<endl;

    initializeClient(&fClient, 10, 2);
    generateTreeLt(&fClient, &lt_k0l, &lt_k1l, a1, b);
    generateTreeLt(&fClient, &lt_k0r, &lt_k1r, a2, b);

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
    // 获取总行数
    unsigned long num_rows = mysql_num_rows(result);    

    // 获取列元数据（列名、类型）
    MYSQL_FIELD* fields = mysql_fetch_fields(result);
    unsigned int num_cols = mysql_num_fields(result); // 总列数（包括 ID）

     // 动态计算每列结果
    std::map<std::string, std::pair<mpz_class, mpz_class>> column_results;
    std::map<std::string, std::vector<std::pair<mpz_class, mpz_class>>> row_results;
    
    // 找到目标列的索引
        int target_col_idx = findColumnIndexByName(fields, num_cols, column);
        if (target_col_idx == -1) {
            json err_json;
            err_json["error"] = "列名 '" + column + "' 未在表中找到";
            return err_json.dump();
        }


    for (unsigned long i = 0; i < num_rows; ++i) {
        MYSQL_ROW row = mysql_fetch_row(result);
        if (!row) continue;

        const char* col_value_str = row[target_col_idx];
        if (!col_value_str) continue;

        uint64_t i_val = 0;
        try {
            i_val = std::stoull(col_value_str);
        } catch (...) {
            continue; // 或者记录错误
        }

        mpz_class  lt_ans0r = evaluateLt(&fServer, &lt_k0r, i_val);
        mpz_class  lt_ans1r = evaluateLt(&fServer, &lt_k1r, i_val);
        mpz_class  lt_ans0l = evaluateLt(&fServer, &lt_k0l, i_val);
        mpz_class lt_ans1l = evaluateLt(&fServer, &lt_k1l, i_val);

        // 遍历所有列，为每一列计算 f0 * col_val, f1 * col_val
        for (unsigned int col_idx = 0; col_idx < num_cols; ++col_idx) {
            const char* col_name = fields[col_idx].name;
            std::string col_str = row[col_idx] ? row[col_idx] : "";

            if (col_str.empty()) continue;

            uint64_t col_val = std::stoull(col_str);
            

            // mpz_class f0 = lt_ans0r - lt_ans1r;
            // mpz_class f1 =  lt_ans0l - lt_ans1l;

 

            mpz_class f00 = lt_ans0r * col_val + lt_ans1l *  col_val;
            mpz_class f11 = lt_ans0l * col_val + lt_ans1r *  col_val;




            // row_results[col_name].emplace_back(f0 * col_val, f1 * col_val);
            row_results[col_name].emplace_back(f00, f11);
        }
    }

         g_ans0_data_for_8081.clear();
         g_ans1_data_for_8082.clear();

        // 遍历每列的结果，存储所有行的数据
        for (const auto& [col_name, row_vals] : row_results) {
            // 为每列初始化向量
            std::vector<mpz_class> ans0_values;
            std::vector<mpz_class> ans1_values;
            
            // 遍历每行数据
            for (const auto& [ans0, ans1] : row_vals) {
                ans0_values.push_back(ans0);
                ans1_values.push_back(ans1);
            }
            
            // 存储到全局变量
            g_ans0_data_for_8081[col_name] = ans0_values;
            g_ans1_data_for_8082[col_name] = ans1_values;
        }


    json j;
    j["status"] = "success";
    j["table"] = table;
    // json columns_array = json::array();

    // for (const auto& [col_name, row_vals] : row_results) {
    //     json col_data = {
    //         {"name", col_name},
    //         {"rows", json::array()}
    //     };
        
    //     for (const auto& [ans0, ans1] : row_vals) {
    //         col_data["rows"].push_back({
    //             {"ans0", ans0.get_str()},
    //             {"ans1", ans1.get_str()}
    //         });
    //     }
        
    //     columns_array.push_back(col_data);
    // }

    // j["columns"] = columns_array;
    return j.dump();
}

// 计算 DCF 结果，并以 JSON 格式返回 ans0 和 ans1
std::string compute_dpf_results(const std::string& input_str, const std::string& table, const std::string& column) {
    uint64_t a = 0;
    try {
        a = std::stoull(input_str); // 转成 uint64_t
    } catch (...) {
        json err_json;
        err_json["error"] = "输入的 query 必须是正整数";
        return err_json.dump(); // 返回 JSON 格式错误
    }

    uint64_t b = 1;
   

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
    // 获取总行数
    unsigned long num_rows = mysql_num_rows(result);    

    // 获取列元数据（列名、类型）
    MYSQL_FIELD* fields = mysql_fetch_fields(result);
    unsigned int num_cols = mysql_num_fields(result); // 总列数（包括 ID）

     // 动态计算每列结果
    std::map<std::string, std::pair<mpz_class, mpz_class>> column_results;
    std::map<std::string, std::vector<std::pair<mpz_class, mpz_class>>> row_results;
    
    // 找到目标列的索引
        int target_col_idx = findColumnIndexByName(fields, num_cols, column);
        if (target_col_idx == -1) {
            json err_json;
            err_json["error"] = "列名 '" + column + "' 未在表中找到";
            return err_json.dump();
        }


    for (unsigned long i = 0; i < num_rows; ++i) {
        MYSQL_ROW row = mysql_fetch_row(result);
        if (!row) continue;

        const char* col_value_str = row[target_col_idx];
        if (!col_value_str) continue;

        uint64_t i_val = 0;
        try {
            i_val = std::stoull(col_value_str);
        } catch (...) {
            continue; // 或者记录错误
        }

        mpz_class f0 = evaluateEq(&fServer, &k0, i_val);
        mpz_class f1 = evaluateEq(&fServer, &k1, i_val);

        // 遍历所有列，为每一列计算 f0 * col_val, f1 * col_val
        for (unsigned int col_idx = 0; col_idx < num_cols; ++col_idx) {
            const char* col_name = fields[col_idx].name;
            std::string col_str = row[col_idx] ? row[col_idx] : "";

            if (col_str.empty()) continue;

            uint64_t col_val = std::stoull(col_str);
            

            row_results[col_name].emplace_back(f0 * col_val, f1 * col_val);
        }
    }

         g_ans0_data_for_8081.clear();
         g_ans1_data_for_8082.clear();

        // 遍历每列的结果，存储所有行的数据
        for (const auto& [col_name, row_vals] : row_results) {
            // 为每列初始化向量
            std::vector<mpz_class> ans0_values;
            std::vector<mpz_class> ans1_values;
            
            // 遍历每行数据
            for (const auto& [ans0, ans1] : row_vals) {
                ans0_values.push_back(ans0);
                ans1_values.push_back(ans1);
            }
            
            // 存储到全局变量
            g_ans0_data_for_8081[col_name] = ans0_values;
            g_ans1_data_for_8082[col_name] = ans1_values;
        }


    json j;
    j["status"] = "success";
    j["table"] = table;
    return j.dump();
}

std::string compute_idpf_results(const std::string& input_str, const std::string& table, const std::string& column){
    // 待完成
}





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
                    std::string column = jsonData["column"].get<std::string>(); // 获取列名
                    std::string mode = jsonData["mode"].get<std::string>(); // 获取模式
                    std::cout << "🔍 用户输入: " << userInput << std::endl;
                    std::cout << "📋 选择的表: " << table << std::endl;
                    std::cout << "🔍 选则的列: " << column << std::endl;
                    std::cout << "📋 选择模式: " << mode << std::endl;

                    // 调用核心函数，得到 JSON 格式的 ans0 和 ans1

                    if (mode == "exact")
                    {
                        responseText = compute_dpf_results(userInput, table, column); // 传递表名
                    }

                    if (mode == "range")
                    {
                        responseText = compute_dcf_results(userInput, table, column); // 传递表名
                    }

                    if (mode == "prefix")
                    {
                        responseText = compute_idpf_results(userInput, table, column); // 传递表名
                    }

                    
                  

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

    // ✅ 注册 POST 路由：/api/getTableColumns
app().registerHandler(
    "/api/getTableColumns",
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

            if (jsonData.contains("table") && jsonData["table"].is_string()) {
                std::string tableName = jsonData["table"].get<std::string>();

                std::cout << "🔍 正在获取表 " << tableName << " 的列信息..." << std::endl;

                // 连接 MySQL
                MYSQL* conn = mysql_init(nullptr);
                if (!conn) {
                    json err_json;
                    err_json["error"] = "MySQL init failed";
                    responseText = err_json.dump();
                } else {
                    if (!mysql_real_connect(conn, "127.0.0.1", "root", "123456", "test", 3306, nullptr, 0)) {
                        mysql_close(conn);
                        json err_json;
                        err_json["error"] = std::string("MySQL connect failed: ") + mysql_error(conn);
                        responseText = err_json.dump();
                    } else {
                        std::string queryStr = "DESCRIBE " + tableName;
                        if (mysql_query(conn, queryStr.c_str())) {
                            mysql_close(conn);
                            json err_json;
                            err_json["error"] = std::string("MySQL DESCRIBE failed: ") + mysql_error(conn);
                            responseText = err_json.dump();
                        } else {
                            MYSQL_RES* result = mysql_store_result(conn);
                            if (!result) {
                                mysql_close(conn);
                                json err_json;
                                err_json["error"] = "Failed to get DESCRIBE result set";
                                responseText = err_json.dump();
                            } else {
                                json columns_json = json::array();
                                MYSQL_ROW row;
                                while ((row = mysql_fetch_row(result))) {
                                    if (!row || mysql_num_fields(result) < 2) continue;

                                    std::string fieldName = row[0] ? row[0] : "";
                                    std::string fieldType = row[1] ? row[1] : "";

                                    if (!fieldName.empty()) {
                                        json col_info = {
                                            {"name", fieldName},
                                            {"type", fieldType}
                                        };
                                        columns_json.push_back(col_info);
                                    }
                                }
                                mysql_free_result(result);
                                mysql_close(conn);

                                json j;
                                j["status"] = "success";
                                j["table"] = tableName;
                                j["columns"] = columns_json;

                                 std::cout << "🔍 正在获取表 " << columns_json << " 的列信息..." << std::endl;

                                responseText = j.dump();
                            }
                        }
                    }
                }

            } else {
                json err_json;
                err_json["error"] = "JSON 中缺少 'table' 字段，或不是字符串。请传入如：{\"table\": \"user_stats\"}";
                responseText = err_json.dump();
            }
        } catch (const std::exception& e) {
            json err_json;
            err_json["error"] = std::string("后端异常: ") + e.what();
            responseText = err_json.dump();
        }

        // 返回 JSON
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody(responseText);
        resp->setContentTypeCode(ContentType::CT_APPLICATION_JSON);
        resp->addHeader("Access-Control-Allow-Origin", "*");
        callback(resp);
    },
    {HttpMethod::Post, HttpMethod::Options}  // ✅ 只接受 POST
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

    app().addListener("0.0.0.0", 8081);

    app().registerHandler(
    "/server0",
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

        json j;
        j["status"] = "success";
        
        json columns_array = json::array();
        for (const auto& [col_name, ans0_values] : g_ans0_data_for_8081) {
            json col_data = {
                {"name", col_name},
                {"ans0_values", json::array()}
            };
            
            for (const auto& val : ans0_values) {
                col_data["ans0_values"].push_back(val.get_str());
            }
            
            columns_array.push_back(col_data);
        }
        j["columns"] = columns_array;

        auto resp = HttpResponse::newHttpResponse();
        resp->setBody(j.dump());
        resp->setContentTypeCode(ContentType::CT_APPLICATION_JSON);
        resp->addHeader("Access-Control-Allow-Origin", "*");
        callback(resp);
    },
    {HttpMethod::Post, HttpMethod::Options}
);



    app().addListener("0.0.0.0", 8082);

    app().registerHandler(
    "/server1",
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

        json j;
        j["status"] = "success";
        
        json columns_array = json::array();
        for (const auto& [col_name, ans1_values] : g_ans1_data_for_8082) {
            json col_data = {
                {"name", col_name},
                {"ans1_values", json::array()}
            };
            
            for (const auto& val : ans1_values) {
                col_data["ans1_values"].push_back(val.get_str());
            }
            
            columns_array.push_back(col_data);
        }
        j["columns"] = columns_array;

        auto resp = HttpResponse::newHttpResponse();
        resp->setBody(j.dump());
        resp->setContentTypeCode(ContentType::CT_APPLICATION_JSON);
        resp->addHeader("Access-Control-Allow-Origin", "*");
        callback(resp);

       
    },
    {HttpMethod::Post, HttpMethod::Options}
);



    // 启动服务
    app().run();

    return 0;
}