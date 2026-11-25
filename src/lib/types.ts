
export type Personnel = {
  id: number;
  name: string;
  cardId: string;
  rank: string;
  jobTitle?: string;
  specialization?: string;
  academicQualification?: string;
  major?: string;
  batch?: string;
  administration: string;
  status: string;
  statusDetail?: string;
  statusDate?: string;
  appointmentDate?: string;
  certificateType?: string;
  lastReturnDate?: string;
  transferDate?: string;
  reportingDate?: string;
  bloodType?: string;
  maritalStatus?: string;
  religion?: string;
  notes?: string;
  photo?: string;
  dateOfBirth?: string;
  nationalId?: string;
  phoneNumbers?: {
      sudani?: string;
      zain?: string;
      mtn?: string;
  };
  state?: string;
  city?: string;
  locality?: string;
  address?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinAddress?: string;
  importantJobs?: any[];
  serviceOperations?: any[];
  decisiveStorm?: any[];
  trainingCourses?: any[];
  serviceHistory?: any[];
  medals?: any[];
  languages?: any[];
  fatherName?: string;
  fatherAddress?: string;
  motherName?: string;
  wifeName?: string;
  children?: any[];
  brothers?: any[];
  sisters?: any[];
  mechanisms?: any[];
};

export type Attachment = {
  id: string;
  personnelId: number;
  name: string;
  type: string;
  size: string;
  uploadDate: string; // ISO String
  dataUrl: string;
};

export type User = {
    id: number;
    name: string;
    role: string;
    lastLogin: string;
    status: 'نشط' | 'غير نشط';
    password?: string;
};

export type Role = {
  name: string;
  description: string;
  permissions: {
    id: string;
    name: string;
    enabled: boolean;
  }[];
};

export type ActivityType = 'add_personnel' | 'edit_personnel' | 'delete_personnel' | 'create_report' | 'promotion';

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO date string
};

export type Backup = {
  id: string;
  date: string; // ISO Date string
  size: string;
  status: 'مكتمل' | 'فشل';
};

export type AutoBackupSettings = {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
};
