
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Supplier, Group } from '../../types';

interface CollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: Group;
  onUpdateSystem: (updatedSystem: Group) => void;
}

const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({ isOpen, onClose, system, onUpdateSystem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPix, setFormPix] = useState('');

  const colaboradores = system.fornecedores || [];

  const filtered = colaboradores.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpf && c.cpf.includes(searchTerm))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleEdit = (colab: Supplier) => {
    setEditingId(colab.id);
    setFormName(colab.name);
    setFormCpf(colab.cpf || '');
    setFormPix(colab.chavePix || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = colaboradores.map(c => 
      c.id === editingId ? { ...c, name: formName, cpf: formCpf, chavePix: formPix } : c
    );
    onUpdateSystem({ ...system, fornecedores: updated });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir permanentemente este colaborador do cadastro?')) {
      const updated = colaboradores.filter(c => c.id !== id);
      onUpdateSystem({ ...system, fornecedores: updated });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciador de Colaboradores" size="4xl">
      <div className="space-y-4">
        <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg text-xs text-light-subtle border border-light-border dark:border-dark-border">
          Este é o banco de dados permanente do seu grupo. Chaves PIX e CPFs cadastrados aqui serão vinculados automaticamente aos relatórios importados.
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2.5 pl-10 rounded-xl bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary outline-none text-sm"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-light-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <div className="max-h-[50vh] overflow-y-auto border border-light-border dark:border-dark-border rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase bg-light-bg dark:bg-dark-bg text-light-subtle sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5">Colaborador / Cadastro</th>
                <th className="px-4 py-2.5">CPF</th>
                <th className="px-4 py-2.5">Chave PIX</th>
                <th className="px-4 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(c => (
                <tr key={c.id} className="border-b border-light-border dark:border-dark-border hover:bg-light-primary/5 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input 
                        type="text" 
                        value={formName} 
                        onChange={e => setFormName(e.target.value)} 
                        className="w-full p-1.5 text-sm rounded border border-light-primary bg-white dark:bg-gray-700 outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="font-bold text-light-heading dark:text-dark-heading uppercase truncate max-w-[200px]">{c.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input 
                        type="text" 
                        value={formCpf} 
                        onChange={e => setFormCpf(e.target.value)} 
                        placeholder="CPF"
                        className="w-full p-1.5 text-sm rounded border border-light-primary bg-white dark:bg-gray-700 outline-none"
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-light-subtle dark:text-dark-subtle">{c.cpf || 'N/I'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input 
                        type="text" 
                        value={formPix} 
                        onChange={e => setFormPix(e.target.value)} 
                        placeholder="Insira a chave PIX"
                        className="w-full p-1.5 text-sm rounded border border-light-primary bg-white dark:bg-gray-700 outline-none"
                      />
                    ) : (
                      <span className={`font-mono text-xs ${c.chavePix ? 'text-light-accent font-bold' : 'text-light-danger italic'}`}>
                        {c.chavePix || 'Não cadastrado'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      {editingId === c.id ? (
                        <>
                          <button onClick={handleSave} className="text-green-600 font-bold hover:underline text-xs">Salvar</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline text-xs">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(c)} className="p-1.5 text-light-subtle hover:text-light-primary transition-colors" title="Editar"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-light-subtle hover:text-light-danger transition-colors" title="Excluir"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-10 text-center text-light-subtle">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default CollaboratorsModal;
