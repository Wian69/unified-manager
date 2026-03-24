#include <windows.h>
#include <winhttp.h>
#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <ctime>

#pragma comment(lib, "winhttp.lib")

// --- Configuration (Azure AD App Registration) ---
const std::wstring TENANT_ID = L"YOUR_TENANT_ID";
const std::wstring CLIENT_ID = L"YOUR_CLIENT_ID";
const std::wstring CLIENT_SECRET = L"YOUR_CLIENT_SECRET";

const std::wstring SERVER_HOST = L"localhost"; 
const int SERVER_PORT = 3000;
const std::wstring AGENT_VERSION = L"2.1.0-cpp-unified";

// ============================================================================
// Core Authentication Manager
// ============================================================================
class AuthManager {
public:
    AuthManager(const std::wstring& t, const std::wstring& c, const std::wstring& s) 
        : m_tenantId(t), m_clientId(c), m_clientSecret(s), m_expiryTime(0) {}

    bool FetchToken() {
        HINTERNET hSession = WinHttpOpen(L"UEA-Auth/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
        HINTERNET hConnect = WinHttpConnect(hSession, L"login.microsoftonline.com", INTERNET_DEFAULT_HTTPS_PORT, 0);
        std::wstring path = L"/" + m_tenantId + L"/oauth2/v2.0/token";
        HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"POST", path.c_str(), NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);

        std::wstring body = L"client_id=" + m_clientId + L"&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=" + m_clientSecret + L"&grant_type=client_credentials";
        std::string payload(body.begin(), body.end());

        if (WinHttpSendRequest(hRequest, L"Content-Type: application/x-www-form-urlencoded\r\n", -1, (LPVOID)payload.c_str(), (DWORD)payload.length(), (DWORD)payload.length(), 0) && WinHttpReceiveResponse(hRequest, NULL)) {
            std::string response = ReadResponse(hRequest);
            size_t tokenPos = response.find("\"access_token\":\"");
            if (tokenPos != std::string::npos) {
                tokenPos += 16;
                size_t endPos = response.find("\"", tokenPos);
                m_accessToken = std::wstring(response.begin() + tokenPos, response.begin() + endPos);
                m_expiryTime = std::time(nullptr) + 3500;
                Cleanup(hRequest, hConnect, hSession);
                return true;
            }
        }
        Cleanup(hRequest, hConnect, hSession);
        return false;
    }

    std::wstring GetToken() { if (std::time(nullptr) >= m_expiryTime) FetchToken(); return m_accessToken; }

private:
    std::string ReadResponse(HINTERNET h) {
        std::string res = ""; DWORD sz = 0;
        do { WinHttpQueryDataAvailable(h, &sz); if (sz == 0) break; char* buf = new char[sz + 1]; ZeroMemory(buf, sz + 1);
        DWORD dwn = 0; WinHttpReadData(h, (LPVOID)buf, sz, &dwn); res += buf; delete[] buf; } while (sz > 0);
        return res;
    }
    void Cleanup(HINTERNET r, HINTERNET c, HINTERNET s) { if(r) WinHttpCloseHandle(r); if(c) WinHttpCloseHandle(c); if(s) WinHttpCloseHandle(s); }
    std::wstring m_tenantId, m_clientId, m_clientSecret, m_accessToken;
    long long m_expiryTime;
};

// ============================================================================
// Direct Graph Client
// ============================================================================
class GraphClient {
public:
    GraphClient(AuthManager& a) : m_auth(a) {}
    std::string Call(const std::wstring& method, const std::wstring& path, const std::string& body = "") {
        HINTERNET hSession = WinHttpOpen(L"UEA-Graph/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
        HINTERNET hConnect = WinHttpConnect(hSession, L"graph.microsoft.com", INTERNET_DEFAULT_HTTPS_PORT, 0);
        HINTERNET hRequest = WinHttpOpenRequest(hConnect, method.c_str(), path.c_str(), NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);
        std::wstring hToken = L"Authorization: Bearer " + m_auth.GetToken() + L"\r\nContent-Type: application/json\r\n";
        std::string res = "";
        if (WinHttpSendRequest(hRequest, hToken.c_str(), -1, (LPVOID)body.c_str(), (DWORD)body.length(), (DWORD)body.length(), 0) && WinHttpReceiveResponse(hRequest, NULL)) {
            DWORD sz = 0; do { WinHttpQueryDataAvailable(hRequest, &sz); if (sz == 0) break; char* buf = new char[sz + 1]; ZeroMemory(buf, sz + 1);
            DWORD dwn = 0; WinHttpReadData(hRequest, (LPVOID)buf, sz, &dwn); res += buf; delete[] buf; } while (sz > 0);
        }
        WinHttpCloseHandle(hRequest); WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession);
        return res;
    }
private: AuthManager& m_auth;
};

// ============================================================================
// Functional Modules (Direct Graph API)
// ============================================================================
class IntuneManager {
public:
    IntuneManager(GraphClient& g) : m_graph(g) {}

    // Defender
    std::string QuickScan(const std::wstring& id) { return m_graph.Call(L"POST", L"/deviceManagement/managedDevices/" + id + L"/quickScan"); }
    std::string FullScan(const std::wstring& id) { return m_graph.Call(L"POST", L"/deviceManagement/managedDevices/" + id + L"/fullScan"); }
    
    // SharePoint
    std::string ListSiteDrives(const std::wstring& siteId) { return m_graph.Call(L"GET", L"/sites/" + siteId + L"/drives"); }
    std::string ListDriveItems(const std::wstring& driveId) { return m_graph.Call(L"GET", L"/drives/" + driveId + L"/root/children"); }
    
    // Emails
    std::string GetRecentEmails(const std::wstring& userId) { return m_graph.Call(L"GET", L"/users/" + userId + L"/messages?$top=5&$select=subject,from,receivedDateTime"); }
    
    // Offboarding
    std::string WipeDevice(const std::wstring& id) { return m_graph.Call(L"POST", L"/deviceManagement/managedDevices/" + id + L"/wipe"); }
    std::string RetireDevice(const std::wstring& id) { return m_graph.Call(L"POST", L"/deviceManagement/managedDevices/" + id + L"/retire"); }
    std::string DeleteUser(const std::wstring& id) { return m_graph.Call(L"DELETE", L"/users/" + id); }

private:
    GraphClient& m_graph;
};

// ============================================================================
// Main Application Logic
// ============================================================================
AuthManager auth(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
GraphClient graph(auth);
IntuneManager manager(graph);

std::wstring GetMachineName() { wchar_t b[MAX_COMPUTERNAME_LENGTH + 1]; DWORD s = sizeof(b)/sizeof(b[0]); return GetComputerNameW(b, &s) ? std::wstring(b) : L"UNKNOWN"; }
std::wstring GetSerialNumber() {
    // In a real scenario, this would use WMI to get the BIOS serial
    // For this version, we'll prefix it to distinguish from PowerShell
    return L"CPP-" + GetMachineName(); 
}

std::string Heartbeat() {
    HINTERNET hSession = WinHttpOpen(L"UEA/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    HINTERNET hConnect = WinHttpConnect(hSession, SERVER_HOST.c_str(), SERVER_PORT, 0);
    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"POST", L"/api/agent/heartbeat", NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, 0);
    std::wstringstream ws; ws << L"{\"agentId\":\"" << GetSerialNumber() << L"\",\"serialNumber\":\"" << GetSerialNumber() << L"\",\"deviceName\":\"" << GetMachineName() << L"\",\"version\":\"" << AGENT_VERSION << L"\"}";
    std::string p; std::wstring t = ws.str(); p.assign(t.begin(), t.end());
    std::string res = "";
    if (WinHttpSendRequest(hRequest, L"Content-Type: application/json\r\n", -1, (LPVOID)p.c_str(), (DWORD)p.length(), (DWORD)p.length(), 0) && WinHttpReceiveResponse(hRequest, NULL)) {
        DWORD sz = 0; do { WinHttpQueryDataAvailable(hRequest, &sz); if (sz == 0) break; char* buf = new char[sz + 1]; ZeroMemory(buf, sz + 1);
        DWORD dwn = 0; WinHttpReadData(hRequest, (LPVOID)buf, sz, &dwn); res += buf; delete[] buf; } while (sz > 0);
    }
    WinHttpCloseHandle(hRequest); WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession);
    return res;
}

void ProcessCommands(const std::string& res) {
    if (res.find("\"type\":\"QuickScan\"") != std::string::npos) {
        std::cout << "Action: Defender QuickScan initiated." << std::endl;
        manager.QuickScan(GetSerialNumber());
    }
    if (res.find("\"type\":\"WipeDevice\"") != std::string::npos) {
        std::cout << "Action: Remote wipe initiated." << std::endl;
        manager.WipeDevice(GetSerialNumber());
    }
    if (res.find("\"type\":\"ListSharePoint\"") != std::string::npos) {
        // Example: Site ID would be provided in the command payload in a real scenario
        std::cout << "Action: Listing SharePoint drives..." << std::endl;
        std::cout << manager.ListSiteDrives(L"root") << std::endl;
    }
    if (res.find("\"type\":\"TrackEmails\"") != std::string::npos) {
        std::cout << "Action: Tracking recent emails..." << std::endl;
        // In a real scenario, the userId would be extracted from the JSON
        // std::cout << manager.GetRecentEmails(L"user@domain.com") << std::endl;
    }
}

int main(int argc, char* argv[]) {
    std::wcout << L"Unified Intune Manager Agent (C++) v" << AGENT_VERSION << L" Started." << std::endl;
    if (auth.FetchToken()) std::cout << "Authenticated with Microsoft Graph." << std::endl;
    else std::cerr << "Auth failed! Check credentials." << std::endl;

    while (true) {
        try {
            std::string res = Heartbeat();
            if (!res.empty()) ProcessCommands(res);
        } catch (...) { std::cerr << "Sync failed." << std::endl; }
        Sleep(60000);
    }
    return 0;
}
