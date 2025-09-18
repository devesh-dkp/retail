import React from 'react';

const teamMembers = [
  { name: 'Ayush Singh', rollNumber: '202408003' },
  { name: 'Devesh Kumar Pandey', rollNumber: '202408004' },
  { name: 'Gaurav Singh', rollNumber: '202408005' },
  { name: 'Karan Ravi Das', rollNumber: '202408006' },
  { name: 'Prakash Kumar Jha', rollNumber: '202408007' },
  { name: 'Shivam Yadav', rollNumber: '202408008' },
  { name: 'Yashveer', rollNumber: '202408009' },
];

const Team: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl mx-auto border border-slate-200">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-slate-800">Our Team (Group 51)</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div key={member.rollNumber} className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-indigo-600">{member.name}</h3>
              <p className="text-sm text-slate-500">{member.rollNumber}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Team;
