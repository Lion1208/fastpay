#!/usr/bin/env python3
"""
PIX Payment Management System - Backend API Testing
Tests all backend endpoints for the PIX payment system with referral features.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PIXSystemTester:
    def __init__(self, base_url="https://commission-manager-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": test_name, "details": details})

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    use_admin: bool = False, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add auth token if available
        token = self.admin_token if use_admin else self.token
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_admin_login(self):
        """Test admin login with ADMIN001/admin123"""
        print("\n🔐 Testing Admin Authentication...")
        
        success, response = self.make_request(
            "POST", "auth/login", 
            {"codigo": "ADMIN001", "senha": "admin123"}
        )
        
        if success and "token" in response:
            self.admin_token = response["token"]
            user_data = response.get("user", {})
            self.log_result("Admin Login", True, f"Logged in as {user_data.get('nome', 'Admin')}")
            return True
        else:
            self.log_result("Admin Login", False, f"Response: {response}")
            return False

    def test_user_registration(self):
        """Test user registration with referral code"""
        print("\n👤 Testing User Registration...")
        
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "codigo_indicador": "ADMIN001",
            "senha": "test123",
            "nome": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "cpf_cnpj": "12345678901",
            "whatsapp": "11999999999"
        }
        
        success, response = self.make_request(
            "POST", "auth/register", test_data, expected_status=200
        )
        
        if success and "token" in response:
            self.token = response["token"]
            user_data = response.get("user", {})
            self.test_user_id = user_data.get("id")
            self.log_result("User Registration", True, f"Created user: {user_data.get('codigo')}")
            return True
        else:
            self.log_result("User Registration", False, f"Response: {response}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.make_request("GET", "dashboard/stats")
        
        if success:
            required_fields = [
                "saldo_disponivel", "saldo_comissoes", "valor_movimentado",
                "total_transacoes", "can_refer", "chart_data"
            ]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_result("Dashboard Stats", True, f"All required fields present")
            else:
                self.log_result("Dashboard Stats", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Dashboard Stats", False, f"Response: {response}")

    def test_transaction_creation(self):
        """Test transaction creation"""
        print("\n💳 Testing Transaction Creation...")
        
        transaction_data = {
            "valor": 100.0,
            "cpf_cnpj": "12345678901",
            "descricao": "Test Payment"
        }
        
        success, response = self.make_request(
            "POST", "transactions", transaction_data, expected_status=200
        )
        
        if success and "id" in response:
            self.log_result("Transaction Creation", True, f"Created transaction: {response.get('id')}")
            return response.get("id")
        else:
            self.log_result("Transaction Creation", False, f"Response: {response}")
            return None

    def test_transaction_listing(self):
        """Test transaction listing"""
        print("\n📋 Testing Transaction Listing...")
        
        success, response = self.make_request("GET", "transactions")
        
        if success and "transactions" in response:
            transactions = response["transactions"]
            self.log_result("Transaction Listing", True, f"Found {len(transactions)} transactions")
        else:
            self.log_result("Transaction Listing", False, f"Response: {response}")

    def test_referrals(self):
        """Test referral system"""
        print("\n👥 Testing Referral System...")
        
        success, response = self.make_request("GET", "referrals")
        
        if success:
            required_fields = ["referrals", "can_refer", "codigo_indicacao"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_result("Referral System", True, f"Referral code: {response.get('codigo_indicacao')}")
            else:
                self.log_result("Referral System", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Referral System", False, f"Response: {response}")

    def test_commissions(self):
        """Test commission system"""
        print("\n💰 Testing Commission System...")
        
        success, response = self.make_request("GET", "commissions")
        
        if success and "commissions" in response:
            commissions = response["commissions"]
            total = response.get("total_comissoes", 0)
            self.log_result("Commission System", True, f"Found {len(commissions)} commissions, total: R${total}")
        else:
            self.log_result("Commission System", False, f"Response: {response}")

    def test_withdrawal_creation(self):
        """Test withdrawal creation"""
        print("\n🏦 Testing Withdrawal Creation...")
        
        withdrawal_data = {
            "valor": 10.0,  # Minimum withdrawal amount
            "chave_pix": "test@example.com",
            "tipo_chave": "email"
        }
        
        success, response = self.make_request(
            "POST", "withdrawals", withdrawal_data, expected_status=200
        )
        
        if success and "id" in response:
            self.log_result("Withdrawal Creation", True, f"Created withdrawal: {response.get('id')}")
            return response.get("id")
        else:
            # Might fail due to insufficient balance, which is expected
            if "Saldo insuficiente" in str(response):
                self.log_result("Withdrawal Creation", True, "Correctly rejected due to insufficient balance")
            else:
                self.log_result("Withdrawal Creation", False, f"Response: {response}")
            return None

    def test_ticket_creation(self):
        """Test support ticket creation"""
        print("\n🎫 Testing Support Ticket Creation...")
        
        ticket_data = {
            "assunto": "Test Support Ticket",
            "mensagem": "This is a test support ticket message.",
            "prioridade": "normal"
        }
        
        success, response = self.make_request(
            "POST", "tickets", ticket_data, expected_status=200
        )
        
        if success and "id" in response:
            self.log_result("Ticket Creation", True, f"Created ticket: {response.get('id')}")
            return response.get("id")
        else:
            self.log_result("Ticket Creation", False, f"Response: {response}")
            return None

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n🛡️ Testing Admin Endpoints...")
        
        if not self.admin_token:
            self.log_result("Admin Endpoints", False, "No admin token available")
            return
        
        # Test admin stats
        success, response = self.make_request("GET", "admin/stats", use_admin=True)
        if success:
            required_fields = ["total_users", "total_transactions", "total_volume"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_result("Admin Stats", True, f"Users: {response.get('total_users')}, Volume: R${response.get('total_volume', 0)}")
            else:
                self.log_result("Admin Stats", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Admin Stats", False, f"Response: {response}")
        
        # Test admin user listing
        success, response = self.make_request("GET", "admin/users", use_admin=True)
        if success and "users" in response:
            users = response["users"]
            self.log_result("Admin User Listing", True, f"Found {len(users)} users")
        else:
            self.log_result("Admin User Listing", False, f"Response: {response}")

    def test_api_keys(self):
        """Test API key management"""
        print("\n🔑 Testing API Key Management...")
        
        # List existing keys
        success, response = self.make_request("GET", "api-keys")
        if success and "keys" in response:
            keys = response["keys"]
            self.log_result("API Key Listing", True, f"Found {len(keys)} API keys")
        else:
            self.log_result("API Key Listing", False, f"Response: {response}")
        
        # Create new API key (using query parameter as expected by backend)
        success, response = self.make_request(
            "POST", "api-keys?name=Test API Key", None, expected_status=200
        )
        if success and "key" in response:
            self.log_result("API Key Creation", True, f"Created key: {response.get('name')}")
        else:
            self.log_result("API Key Creation", False, f"Response: {response}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting PIX System Backend Tests")
        print("=" * 50)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping critical tests")
            return False
        
        if not self.test_user_registration():
            print("❌ User registration failed - some tests may fail")
        
        # Core functionality tests
        self.test_dashboard_stats()
        self.test_transaction_creation()
        self.test_transaction_listing()
        self.test_referrals()
        self.test_commissions()
        self.test_withdrawal_creation()
        self.test_ticket_creation()
        self.test_api_keys()
        
        # Admin tests
        self.test_admin_endpoints()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as successful

def main():
    """Main test execution"""
    tester = PIXSystemTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())