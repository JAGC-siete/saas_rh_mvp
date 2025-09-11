import { test, expect } from '@playwright/test'

// Tests E2E para funcionalidades de nómina y vouchers
test.describe('Payroll & Vouchers E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar mock de autenticación para Company A
    await page.addInitScript(() => {
      window.mockAuth = {
        user: { id: 'user-1', email: 'test@company-a.com' },
        userProfile: { 
          company_id: 'company-a-123',
          role: 'admin',
          permissions: ['can_generate_payroll', 'can_export_payroll']
        }
      }
    })
  })

  test('Payroll happy path: login Company A → select Año/Mes/Q/Tipo → Preview → Edit → Autorizar → Enviar Mail → ver toast "Enviado"', async ({ page }) => {
    // Mock de datos de empleados de Company A
    await page.addInitScript(() => {
      window.mockEmployees = [
        { id: 'emp-1', name: 'John Doe', status: 'active', company_id: 'company-a-123', base_salary: 15000 },
        { id: 'emp-2', name: 'Jane Smith', status: 'active', company_id: 'company-a-123', base_salary: 20000 },
        { id: 'emp-3', name: 'Bob Johnson', status: 'inactive', company_id: 'company-a-123', base_salary: 18000 }
      ]
    })

    // Navegar a la página de nómina
    await page.goto('/app/payroll')
    
    // Verificar que solo se muestren empleados de Company A
    await expect(page.locator('[data-testid="employee-count"]')).toContainText('2 empleados activos')
    
    // Seleccionar año, mes, quincena y tipo
    await page.selectOption('[data-testid="year-select"]', '2025')
    await page.selectOption('[data-testid="month-select"]', '01')
    await page.selectOption('[data-testid="quincena-select"]', '1')
    await page.selectOption('[data-testid="tipo-select"]', 'CON deducciones')
    
    // Generar Preview
    await page.click('[data-testid="generate-preview-btn"]')
    
    // Verificar que se genere el preview
    await expect(page.locator('[data-testid="preview-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="preview-employee-count"]')).toContainText('2 empleados')
    
    // Ver/Editar Preview
    await page.click('[data-testid="edit-preview-btn"]')
    
    // Verificar que se pueda editar
    await expect(page.locator('[data-testid="editable-fields"]')).toBeVisible()
    
    // Hacer algún cambio en el preview
    await page.fill('[data-testid="bonus-field-emp-1"]', '500')
    
    // Autorizar/Generar
    await page.click('[data-testid="authorize-generate-btn"]')
    
    // Verificar que se genere la nómina
    await expect(page.locator('[data-testid="payroll-generated"]')).toBeVisible()
    
    // Enviar por Mail
    await page.click('[data-testid="send-email-btn"]')
    
    // Verificar toast de éxito
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Enviado')
  })

  test('Voucher happy path: login Company A → elegir empleado propio → Preview → Autorizar → Enviar WhatsApp → ver toast "Enviado"', async ({ page }) => {
    // Mock de datos de empleados de Company A
    await page.addInitScript(() => {
      window.mockEmployees = [
        { id: 'emp-1', name: 'John Doe', status: 'active', company_id: 'company-a-123', base_salary: 15000 },
        { id: 'emp-2', name: 'Jane Smith', status: 'active', company_id: 'company-a-123', base_salary: 20000 }
      ]
    })

    // Navegar a la página de nómina
    await page.goto('/app/payroll')
    
    // Ir a la sección de Generar Voucher
    await page.click('[data-testid="voucher-section-tab"]')
    
    // Seleccionar empleado de Company A
    await page.selectOption('[data-testid="employee-select"]', 'emp-1')
    
    // Seleccionar período y quincena
    await page.selectOption('[data-testid="voucher-month-select"]', '01')
    await page.selectOption('[data-testid="voucher-quincena-select"]', '1')
    await page.selectOption('[data-testid="voucher-tipo-select"]', 'CON deducciones')
    
    // Generar Preview del voucher
    await page.click('[data-testid="generate-voucher-preview-btn"]')
    
    // Verificar que se genere el preview del voucher
    await expect(page.locator('[data-testid="voucher-preview"]')).toBeVisible()
    await expect(page.locator('[data-testid="voucher-employee-name"]')).toContainText('John Doe')
    
    // Ver/Editar voucher
    await page.click('[data-testid="edit-voucher-btn"]')
    
    // Verificar que se pueda editar
    await expect(page.locator('[data-testid="voucher-editable-fields"]')).toBeVisible()
    
    // Hacer algún cambio en el voucher
    await page.fill('[data-testid="voucher-bonus-field"]', '300')
    await page.fill('[data-testid="voucher-note-field"]', 'Bono por desempeño')
    
    // Autorizar/Generar voucher
    await page.click('[data-testid="authorize-voucher-btn"]')
    
    // Verificar que se genere el voucher
    await expect(page.locator('[data-testid="voucher-generated"]')).toBeVisible()
    
    // Enviar por WhatsApp
    await page.click('[data-testid="send-whatsapp-btn"]')
    
    // Verificar toast de éxito
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Enviado')
  })

  test('Cross-tenant guard: login Company A intenta generar con employee_id de Company B → debe fallar con 403 y log con error_code=TENANT_MISMATCH', async ({ page }) => {
    // Mock de datos de empleados de Company B (no autorizada)
    await page.addInitScript(() => {
      window.mockEmployees = [
        { id: 'emp-b-1', name: 'Demo User', status: 'active', company_id: 'company-b-456', base_salary: 25000 }
      ]
    })

    // Navegar a la página de nómina
    await page.goto('/app/payroll')
    
    // Intentar generar voucher para empleado de Company B
    await page.click('[data-testid="voucher-section-tab"]')
    
    // Seleccionar empleado de Company B (esto debería fallar)
    await page.selectOption('[data-testid="employee-select"]', 'emp-b-1')
    
    // Intentar generar preview
    await page.click('[data-testid="generate-voucher-preview-btn"]')
    
    // Verificar que se muestre error 403
    await expect(page.locator('[data-testid="error-message"]')).toContainText('403')
    await expect(page.locator('[data-testid="error-message"]')).toContainText('TENANT_MISMATCH')
    
    // Verificar que se registre el log con error_code
    await expect(page.locator('[data-testid="error-log"]')).toContainText('error_code=TENANT_MISMATCH')
  })

  test('Multi-tenant filtering: Company A solo ve empleados activos de su empresa', async ({ page }) => {
    // Mock de datos mixtos (Company A + Demo + Company B)
    await page.addInitScript(() => {
      window.mockEmployees = [
        // Company A (autorizada)
        { id: 'emp-a-1', name: 'John Doe', status: 'active', company_id: 'company-a-123', base_salary: 15000 },
        { id: 'emp-a-2', name: 'Jane Smith', status: 'active', company_id: 'company-a-123', base_salary: 20000 },
        { id: 'emp-a-3', name: 'Bob Johnson', status: 'inactive', company_id: 'company-a-123', base_salary: 18000 },
        
        // Demo Company (no autorizada)
        { id: 'emp-demo-1', name: 'Demo User', status: 'active', company_id: 'company-demo', base_salary: 25000 },
        
        // Company B (no autorizada)
        { id: 'emp-b-1', name: 'Other User', status: 'active', company_id: 'company-b-456', base_salary: 30000 }
      ]
    })

    // Navegar a la página de nómina
    await page.goto('/app/payroll')
    
    // Verificar que solo se muestren empleados activos de Company A
    await expect(page.locator('[data-testid="employee-count"]')).toContainText('2 empleados activos')
    
    // Verificar que no se muestren empleados de otras empresas
    await expect(page.locator('text=Demo User')).not.toBeVisible()
    await expect(page.locator('text=Other User')).not.toBeVisible()
    
    // Verificar que no se muestren empleados inactivos
    await expect(page.locator('text=Bob Johnson')).not.toBeVisible()
    
    // Generar preview y verificar que solo incluya empleados autorizados
    await page.selectOption('[data-testid="year-select"]', '2025')
    await page.selectOption('[data-testid="month-select"]', '01')
    await page.selectOption('[data-testid="quincena-select"]', '1')
    await page.selectOption('[data-testid="tipo-select"]', 'CON deducciones')
    
    await page.click('[data-testid="generate-preview-btn"]')
    
    // Verificar que el preview solo contenga empleados de Company A
    await expect(page.locator('[data-testid="preview-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="preview-employee-count"]')).toContainText('2 empleados')
    
    // Verificar que solo se muestren empleados autorizados
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Jane Smith')).toBeVisible()
    await expect(page.locator('text=Demo User')).not.toBeVisible()
    await expect(page.locator('text=Other User')).not.toBeVisible()
  })

  test('Email sending validation: credenciales válidas retornan 200 con message_id, inválidas retornan 401/403', async ({ page }) => {
    // Mock de respuesta de email exitosa
    await page.addInitScript(() => {
      window.mockEmailResponse = {
        success: true,
        id: 'msg_123456',
        message: 'Email enviado exitosamente'
      }
    })

    // Navegar a la página de nómina
    await page.goto('/app/payroll')
    
    // Generar preview
    await page.selectOption('[data-testid="year-select"]', '2025')
    await page.selectOption('[data-testid="month-select"]', '01')
    await page.selectOption('[data-testid="quincena-select"]', '1')
    await page.selectOption('[data-testid="tipo-select"]', 'CON deducciones')
    
    await page.click('[data-testid="generate-preview-btn"]')
    
    // Enviar por email con credenciales válidas
    await page.click('[data-testid="send-email-btn"]')
    
    // Verificar respuesta exitosa
    await expect(page.locator('[data-testid="email-success"]')).toContainText('msg_123456')
    
    // Mock de respuesta de email fallida
    await page.addInitScript(() => {
      window.mockEmailResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Credenciales de email inválidas',
        error_code: 'MAIL_CONFIG_MISSING'
      }
    })
    
    // Intentar enviar nuevamente
    await page.click('[data-testid="send-email-btn"]')
    
    // Verificar respuesta de error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('401')
    await expect(page.locator('[data-testid="email-error"]')).toContainText('MAIL_CONFIG_MISSING')
  })

  test('WhatsApp sending validation: credenciales válidas retornan 200 con message_id, inválidas retornan 401/403', async ({ page }) => {
    // Mock de respuesta de WhatsApp exitosa
    await page.addInitScript(() => {
      window.mockWhatsAppResponse = {
        success: true,
        message_id: 'wa_123456',
        message: 'Mensaje de WhatsApp enviado exitosamente'
      }
    })

    // Navegar a la página de nómina
    await page.goto('/app/payroll')
    
    // Generar preview
    await page.selectOption('[data-testid="year-select"]', '2025')
    await page.selectOption('[data-testid="month-select"]', '01')
    await page.selectOption('[data-testid="quincena-select"]', '1')
    await page.selectOption('[data-testid="tipo-select"]', 'CON deducciones')
    
    await page.click('[data-testid="generate-preview-btn"]')
    
    // Enviar por WhatsApp con credenciales válidas
    await page.click('[data-testid="send-whatsapp-btn"]')
    
    // Verificar respuesta exitosa
    await expect(page.locator('[data-testid="whatsapp-success"]')).toContainText('wa_123456')
    
    // Mock de respuesta de WhatsApp fallida
    await page.addInitScript(() => {
      window.mockWhatsAppResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Credenciales de WhatsApp inválidas',
        error_code: 'WHATSAPP_AUTH_FAILED'
      }
    })
    
    // Intentar enviar nuevamente
    await page.click('[data-testid="send-whatsapp-btn"]')
    
    // Verificar respuesta de error
    await expect(page.locator('[data-testid="whatsapp-error"]')).toContainText('401')
    await expect(page.locator('[data-testid="whatsapp-error"]')).toContainText('WHATSAPP_AUTH_FAILED')
  })
})
