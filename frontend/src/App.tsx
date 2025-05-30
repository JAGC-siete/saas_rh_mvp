import { Routes, Route } from 'react-router-dom'
import Navbar from '@components/Navbar'
import Footer from '@components/Footer'
import LandingPage from '@pages/LandingPage'
import { DeploymentTest } from '@components/DeploymentTest'
import HowItWorksPage from '@pages/HowItWorksPage'
import ComienzaGratisPage from '@pages/ComienzaGratisPage'
import PersonalizedAdvicePage from '@pages/PersonalizedAdvicePage'
import AutomatedRecruitmentPage from '@pages/AutomatedRecruitmentPage'
import HrMicroservicesPage from '@pages/HrMicroservicesPage'
import { TranslationProvider } from '@contexts/TranslationContext'
import { ThemeProvider } from '@contexts/ThemeContext'
import { UserTypeProvider } from '@contexts/UserTypeContext'

function App() {
  return (
    <ThemeProvider>
      <TranslationProvider>
        <UserTypeProvider>
          <div className="app min-h-screen flex flex-col">
            <Navbar />
            <DeploymentTest />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/como-funciona" element={<HowItWorksPage />} />
                <Route path="/comienza-gratis" element={<ComienzaGratisPage />} />
                <Route path="/asesoria-laboral" element={<PersonalizedAdvicePage />} />
                <Route path="/reclutamiento" element={<AutomatedRecruitmentPage />} />
                <Route path="/robots" element={<HrMicroservicesPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </UserTypeProvider>
      </TranslationProvider>
    </ThemeProvider>
  )
}

export default App