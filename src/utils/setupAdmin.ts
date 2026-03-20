import { supabase } from '../lib/supabase';

export async function createAdminUser() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@nivvio.com',
      password: 'admin',
      options: {
        data: {
          username: 'admin',
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { success: true, message: 'Usuário admin já existe' };
      }
      throw error;
    }

    if (data.user) {
      await supabase.from('profiles').insert([
        {
          id: data.user.id,
          username: 'admin',
          full_name: 'Administrador',
        },
      ]);
    }

    return { success: true, message: 'Usuário admin criado com sucesso' };
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    return { success: false, message: 'Erro ao criar usuário admin' };
  }
}
