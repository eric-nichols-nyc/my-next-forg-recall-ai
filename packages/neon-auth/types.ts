export type SignUpState = {
  success: boolean;
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
    name?: string[];
  };
};

export type SignInState = {
  success: boolean;
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
  };
};

