import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@contexts/TranslationContext';
import { useUserType } from '@contexts/UserTypeContext';

const ComienzaGratisPage: React.FC = () => {
  const { t } = useTranslation();
  const { userType, setUserType } = useUserType();
  const [formState, setFormState] = useState({
    userType: userType,
    email: '',
    companyName: '',
    industry: '',
    fullName: '',
    jobTitle: '',
    phoneNumber: '',
    jobDescription: '',
    skillsRequired: '',
    benefits: '',
    contactPerson: '',
    isSubmitting: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update formState.userType when userType context changes
  useEffect(() => {
    setFormState(prev => ({ ...prev, userType }));
  }, [userType]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.email) {
      newErrors.email = t('Email is required');
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formState.email)) {
      newErrors.email = t('Invalid email address');
    }
    
    if (!formState.fullName) {
      newErrors.fullName = t('Full name is required');
    }

    if (!formState.phoneNumber) {
      newErrors.phoneNumber = t('Phone number is required');
    }

    if (userType === 'employer') {
      if (!formState.companyName) {
        newErrors.companyName = t('Company name is required');
      }
      if (!formState.industry) {
        newErrors.industry = t('Industry is required');
      }
      if (!formState.jobDescription) {
        newErrors.jobDescription = t('Job description is required');
      }
      if (!formState.contactPerson) {
        newErrors.contactPerson = t('Contact person is required');
      }
    } else {
      // For candidates
      if (fileInputRef.current && !fileInputRef.current.files?.length) {
        newErrors.cv = t('CV is required');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setFormState(prev => ({ ...prev, isSubmitting: true }));
      
      try {
        if (userType === 'employer') {
          // Company submission
          const url = 'https://api.manatal.com/open/v3/organizations/';
          const organizationData = {
            name: formState.companyName,
            industry: formState.industry,
            contact: {
              name: formState.contactPerson,
              email: formState.email,
              phone: formState.phoneNumber
            },
            job_openings: [
              {
                title: formState.jobTitle,
                description: formState.jobDescription,
                requirements: formState.skillsRequired,
                benefits: formState.benefits
              }
            ],
            notes: "From Humano SISU website"
          };
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              Authorization: 'Token 5ae4382cab6e503119634f2f594bee928f3921c8'
            },
            body: JSON.stringify(organizationData)
          });
          
          const data = await response.json();
          console.log('Company submission response:', data);
          
        } else {
          // Candidate submission
          const url = 'https://api.manatal.com/open/v3/candidates/';
          const candidateData = {
            first_name: formState.fullName.split(' ')[0],
            last_name: formState.fullName.split(' ').slice(1).join(' '),
            email: formState.email,
            phone: formState.phoneNumber,
            position: formState.jobTitle,
            stage: "Initial Contact",
            source: "Humano SISU Website"
          };
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              Authorization: 'Token 5ae4382cab6e503119634f2f594bee928f3921c8'
            },
            body: JSON.stringify(candidateData)
          });
          
          const data = await response.json();
          console.log('Candidate submission response:', data);
          
          // Upload CV if available
          if (fileInputRef.current?.files?.length) {
            const candidateId = data.id;
            const cvUploadUrl = `https://api.manatal.com/open/v3/candidates/${candidateId}/resume/`;
            
            const formData = new FormData();
            formData.append('file', fileInputRef.current.files[0]);
            
            const uploadResponse = await fetch(cvUploadUrl, {
              method: 'POST',
              headers: {
                accept: 'application/json',
                Authorization: 'Token 5ae4382cab6e503119634f2f594bee928f3921c8'
              },
              body: formData
            });
            
            const uploadData = await uploadResponse.json();
            console.log('CV upload response:', uploadData);
          }
        }
        
        // Show success message
        setSubmitSuccess(true);
        
      } catch (error) {
        console.error('Error submitting form:', error);
        alert(t('There was an error submitting your information. Please try again.'));
      } finally {
        setFormState(prev => ({ ...prev, isSubmitting: false }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center">
            {t('Start Free')}
          </h1>
          
          <div className="mt-8">
            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={() => setUserType('employer')}
                className={`px-6 py-3 rounded-lg font-medium ${
                  userType === 'employer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('Employer')}
              </button>
              <button
                onClick={() => setUserType('employee')}
                className={`px-6 py-3 rounded-lg font-medium ${
                  userType === 'employee'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('Employee')}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Benefits Column */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  {userType === 'employer' ? t('Company Benefits') : t('Candidate Benefits')}
                </h2>
                
                <div className="space-y-6">
                  {userType === 'employer' ? (
                    <>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('Automated candidate screening')}</h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('Let our RecluBot handle the initial screening process, saving you time and resources.')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('AI matching technology')}</h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('Our AI matches your job requirements with the perfect candidates in our database.')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('Detailed analytics dashboard')}</h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('Track your hiring process with comprehensive analytics and insights.')}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('AI-powered resume enhancement')}</h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('Our Robots will analyze and optimize your CV to make it stand out to recruiters.')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('Daily job recommendations')}</h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('Receive personalized job matches through our RecluBot that align with your skills and goals.')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('Professional career coaching')}</h3>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('Get expert guidance through our Placement Service to advance your career.')}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Form Column */}
              <div>
                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    {userType === 'employer' ? t('Post Your Job Opening') : t('Start Your Job Search Journey')}
                  </h2>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Email')}*
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formState.email}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {userType === 'employer' && (
                <>
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Company Name')}*
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      id="companyName"
                      value={formState.companyName}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.companyName ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Contact Person')}*
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      id="contactPerson"
                      value={formState.contactPerson}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.contactPerson ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.contactPerson && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Industry')}*
                    </label>
                    <select
                      name="industry"
                      id="industry"
                      value={formState.industry}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.industry ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">{t('Select an industry')}</option>
                      <option value="technology">{t('Technology')}</option>
                      <option value="healthcare">{t('Healthcare')}</option>
                      <option value="retail">{t('Retail')}</option>
                      <option value="manufacturing">{t('Manufacturing')}</option>
                      <option value="services">{t('Services')}</option>
                      <option value="finance">{t('Finance')}</option>
                      <option value="education">{t('Education')}</option>
                      <option value="hospitality">{t('Hospitality')}</option>
                      <option value="other">{t('Other')}</option>
                    </select>
                    {errors.industry && (
                      <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Job Title')}*
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      id="jobTitle"
                      value={formState.jobTitle}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Job Description')}*
                    </label>
                    <textarea
                      name="jobDescription"
                      id="jobDescription"
                      rows={4}
                      value={formState.jobDescription}
                      onChange={handleChange}
                      placeholder={t('Describe the job position in detail')}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.jobDescription ? 'border-red-500' : ''
                      }`}
                    ></textarea>
                    {errors.jobDescription && (
                      <p className="mt-1 text-sm text-red-600">{errors.jobDescription}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="skillsRequired" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Skills Required')}
                    </label>
                    <input
                      type="text"
                      name="skillsRequired"
                      id="skillsRequired"
                      value={formState.skillsRequired}
                      onChange={handleChange}
                      placeholder={t('Separate skills with commas')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Benefits')}
                    </label>
                    <textarea
                      name="benefits"
                      id="benefits"
                      rows={3}
                      value={formState.benefits}
                      onChange={handleChange}
                      placeholder={t('List the benefits offered for this position')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    ></textarea>
                  </div>
                </>
              )}
              
              {userType === 'employee' && (
                <div>
                  <label htmlFor="cv" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Upload CV')}*
                  </label>
                  <input
                    type="file"
                    name="cv"
                    id="cv"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.cv ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.cv && (
                    <p className="mt-1 text-sm text-red-600">{errors.cv}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('Accepted formats: PDF, DOC, DOCX')}
                  </p>
                </div>
              )}

                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Full Name')}*
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      id="fullName"
                      value={formState.fullName}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.fullName ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('Job Title')}
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      id="jobTitle"
                      value={formState.jobTitle}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('Phone Number')}*
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  id="phoneNumber"
                  value={formState.phoneNumber}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.phoneNumber ? 'border-red-500' : ''
                  }`}
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                )}
              </div>

              {submitSuccess ? (
                <div className="text-center p-6 bg-green-50 dark:bg-green-900 rounded-lg">
                  <svg className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    {t('Thank you!')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {userType === 'employer'
                      ? t('Your job posting has been submitted. Our team will contact you shortly.')
                      : t('Your profile has been submitted. We will match you with suitable opportunities soon.')}
                  </p>
                </div>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={formState.isSubmitting}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    {formState.isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('Submitting...')}
                      </>
                    ) : (
                      t('Get Started')
                    )}
                  </button>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {t('By signing up, you agree to our')} {' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500">
                      {t('Terms of Service')}
                    </a>{' '}
                    {t('and')}{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500">
                      {t('Privacy Policy')}
                    </a>
                  </p>
                </>
              )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComienzaGratisPage;