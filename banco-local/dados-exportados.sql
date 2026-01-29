-- =====================================================
-- SCRIPT DE EXPORTAÇÃO DE DADOS - Lovable Cloud
-- Gerado em: 29/01/2026
-- =====================================================
-- IMPORTANTE: Execute este script no seu banco local Supabase
-- Certifique-se de que o schema já foi criado antes de executar
-- =====================================================

-- 1. LIMPAR DADOS EXISTENTES (opcional - descomente se necessário)
-- TRUNCATE TABLE vocabulary, quotes, readings, statuses, evaluations, books, book_categories, book_types CASCADE;

-- =====================================================
-- 2. TIPOS DE LIVRO (book_types)
-- =====================================================
INSERT INTO book_types (id, name, created_at) VALUES
  ('0f3641fe-5eca-4942-b33a-3ed377cf9ffa', 'Livro', '2026-01-18 16:35:53.282413+00'),
  ('2e1513f4-1031-4fec-84d5-a97ab9d5fc45', 'Ebook', '2026-01-18 16:35:53.282413+00')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- =====================================================
-- 3. CATEGORIAS DE LIVRO (book_categories)
-- =====================================================
INSERT INTO book_categories (id, name, created_at) VALUES
  ('448f1cea-5d44-44ae-9d71-f5319a322425', 'Espiritualidade ou Religioso', '2026-01-18 16:35:53.282413+00'),
  ('3fea8cb7-bacf-4dda-a29e-204f7ae98185', 'Ficção', '2026-01-18 16:35:53.282413+00'),
  ('2bb44828-5f7e-4c4b-8057-46e45fb9be61', 'Não-Ficção', '2026-01-18 16:35:53.282413+00'),
  ('78af4209-ff86-461c-9260-b64fcf3395b8', 'Biografia', '2026-01-18 16:35:53.282413+00'),
  ('1b664006-0d34-43c5-b9d3-692f9332a062', 'Autoajuda', '2026-01-18 16:35:53.282413+00'),
  ('59f2def9-4d12-4168-b63e-6f1d2995c458', 'Negócios', '2026-01-18 16:35:53.282413+00'),
  ('035ed5ca-3b7c-4dc6-8196-c41251e11769', 'Ciência', '2026-01-18 16:35:53.282413+00'),
  ('0c1874ac-6be0-47dd-a481-748c3a38a22d', 'História', '2026-01-18 16:35:53.282413+00'),
  ('4dde8faa-1f1e-43f8-9dfc-5f30e726665a', 'Romance', '2026-01-18 16:35:53.282413+00'),
  ('d3cc658b-7a08-471e-9ddf-3a729a97bc38', 'Fantasia', '2026-01-18 16:35:53.282413+00'),
  ('1296267d-06fa-4991-aa2d-e2152da2788f', 'Outro', '2026-01-18 16:35:53.282413+00'),
  ('ea9aaa56-b16e-4a94-aaac-a082346a6693', 'Finanças', '2026-01-18 16:57:37.215686+00'),
  ('a94417ec-e26f-47fe-89ee-72a559faccc1', 'Biblia', '2026-01-21 17:35:19.305328+00')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- =====================================================
-- 4. LIVROS (books)
-- =====================================================
-- IMPORTANTE: Substitua 'SEU_USER_ID' pelo seu user_id real
-- Para encontrar seu user_id, execute: SELECT id FROM auth.users WHERE email = 'seu@email.com';

INSERT INTO books (id, name, author, year, total_pages, type, category, paid_value, cover_url, user_id, created_at) VALUES
  ('9b49a41c-1cda-4a30-82f5-917494be0fac', 
   'CASAMENTO LIVRE DE CONFLITOS FINANCEIROS', 
   'CHUCK BENTLEY E ANN BENTLEY', 
   2018, 
   169, 
   'Livro', 
   'Finanças', 
   46.20, 
   'https://gkihrunmbaiogextsicb.supabase.co/storage/v1/object/public/book-covers/covers/1768996113926-3ha9ig.jpeg',
   'SEU_USER_ID', -- SUBSTITUA AQUI
   '2026-01-18 16:57:50.675952+00'),
   
  ('af77e6ab-a156-4c96-8938-24ef9bbc3359', 
   'BÍBLIA MCCHEYNE​', 
   'pastor Robert Murray McCheyne', 
   2023, 
   1439, 
   'Livro', 
   'Biblia', 
   289.90, 
   'https://gkihrunmbaiogextsicb.supabase.co/storage/v1/object/public/book-covers/covers/1769014475597-or81o.jpeg',
   'SEU_USER_ID', -- SUBSTITUA AQUI
   '2026-01-21 16:57:51.143171+00'),
   
  ('0fd6e43d-201d-43d4-b642-27528bb2f1bb', 
   'CINCO SEGREDOS DA RIQUEZA: QUE 96% DAS PESSOAS NÃO SABEM', 
   'Craig Hill', 
   2014, 
   142, 
   'Livro', 
   'Finanças', 
   46.20, 
   'https://gkihrunmbaiogextsicb.supabase.co/storage/v1/object/public/book-covers/covers/1769260898218-z5pdl2.jpeg',
   'SEU_USER_ID', -- SUBSTITUA AQUI
   '2026-01-24 13:22:36.093411+00')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  author = EXCLUDED.author,
  year = EXCLUDED.year,
  total_pages = EXCLUDED.total_pages,
  type = EXCLUDED.type,
  category = EXCLUDED.category,
  paid_value = EXCLUDED.paid_value,
  cover_url = EXCLUDED.cover_url;

-- =====================================================
-- 5. STATUS DOS LIVROS (statuses)
-- =====================================================
INSERT INTO statuses (id, book_id, status, pages_read, user_id, created_at) VALUES
  ('057dd514-9516-4c0f-b507-fda61353e905', '9b49a41c-1cda-4a30-82f5-917494be0fac', 'Lendo', 27, 'SEU_USER_ID', '2026-01-18 16:57:50.922263+00'),
  ('6bb3e5b8-da88-4a1b-81ed-0a1c9ea53260', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 'Lendo', 158, 'SEU_USER_ID', '2026-01-21 16:57:51.39815+00'),
  ('68f94876-7f8e-472a-9153-c2569c409b7d', '0fd6e43d-201d-43d4-b642-27528bb2f1bb', 'Concluido', 142, 'SEU_USER_ID', '2026-01-24 13:22:36.331499+00')
ON CONFLICT (id) DO UPDATE SET 
  status = EXCLUDED.status,
  pages_read = EXCLUDED.pages_read;

-- =====================================================
-- 6. LEITURAS (readings)
-- =====================================================
INSERT INTO readings (id, book_id, day, month, start_page, end_page, time_spent, start_date, end_date, bible_book, bible_chapter, bible_verse_start, bible_verse_end, user_id, created_at) VALUES
  -- Casamento Livre de Conflitos Financeiros
  ('9f72b624-51f5-4488-aae2-a0e77fbdea8b', '9b49a41c-1cda-4a30-82f5-917494be0fac', 16, 'Janeiro', 1, 20, '30', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-18 17:03:33.505511+00'),
  
  -- Bíblia McChene - Leituras diárias
  ('7fd1e42d-8a7f-4754-96d8-325860d90680', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 1, 'Janeiro', 1, 19, '17:52', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:08:29.501685+00'),
  ('d1423ca7-2f89-486b-93b9-4ecf0cec9faa', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 2, 'Janeiro', 20, 24, '23:34', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:09:31.910209+00'),
  ('0fd7e348-19dc-4819-94c2-6edef65a3415', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 3, 'Janeiro', 24, 27, '16:27', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:10:22.646736+00'),
  ('1cf83646-745f-4e7d-86b0-99f3beaf3b07', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 4, 'Janeiro', 27, 30, '21:39', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:10:57.237231+00'),
  ('1e7a333b-eb67-4f92-aaa2-b786e437b686', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 5, 'Janeiro', 31, 35, '23:47', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:12:24.498807+00'),
  ('eea15eba-f963-4217-9ca2-6e9f23746f30', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 6, 'Janeiro', 35, 38, '19:27', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:13:22.961572+00'),
  ('2ca43d5d-4608-4752-b5a4-019b93d20fb1', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 7, 'Janeiro', 38, 43, '24:22', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:20:20.565497+00'),
  ('7e748ced-81a7-43e6-979f-5b0fd86a6ad7', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 8, 'Janeiro', 43, 47, '23:18', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:20:49.607836+00'),
  ('6f195b61-a84d-4c93-9bb0-f1e0f481abe0', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 9, 'Janeiro', 47, 52, '27:34', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:22:01.713749+00'),
  ('c468500d-e5d0-4a4f-ba2f-9b7c7f3f01e1', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 10, 'Janeiro', 52, 56, '26:43', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:22:40.766444+00'),
  ('eee800ae-e86d-4888-8997-cdbf051c6dcb', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 11, 'Janeiro', 57, 59, '17:17', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:23:48.051279+00'),
  ('1db55a82-8580-4297-8ec5-c482a70cc2a8', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 12, 'Janeiro', 60, 63, '21:41', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:38:04.623023+00'),
  ('4c1c923c-69d0-42ed-8de2-ae977bb7e541', 'af77e6ab-a156-4c96-8938-24ef9bbc3359', 13, 'Janeiro', 63, 68, '20:00', NULL, NULL, NULL, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 17:38:45.012771+00')
ON CONFLICT (id) DO UPDATE SET 
  day = EXCLUDED.day,
  month = EXCLUDED.month,
  start_page = EXCLUDED.start_page,
  end_page = EXCLUDED.end_page,
  time_spent = EXCLUDED.time_spent;

-- =====================================================
-- 7. CITAÇÕES (quotes)
-- =====================================================
INSERT INTO quotes (id, book_id, quote, page, bible_book, bible_chapter, bible_verse, user_id, created_at) VALUES
  ('459472aa-1c11-4ef6-952d-eaa2c2e997df', 
   '9b49a41c-1cda-4a30-82f5-917494be0fac', 
   '"A *miríade* de decisões e escolhas enfrentadas pelos casais cria um potencial infindável para conflitos"', 
   18, NULL, NULL, NULL, 'SEU_USER_ID', '2026-01-21 12:38:55.878351+00'),
   
  ('9d631701-72b6-4aba-8b5a-0d88bd70d368', 
   'af77e6ab-a156-4c96-8938-24ef9bbc3359', 
   '¹⁴ Por isto, Deus meu, lembra-te de mim e não risques as beneficências que eu fiz à casa de meu Deus e às suas observâncias. 

Neemias 13:14', 
   110, 'Neemias', 13, 14, 'SEU_USER_ID', '2026-01-23 12:48:33.339776+00'),
   
  ('b84d2a6e-598f-4951-9963-1ab13ac344db', 
   'af77e6ab-a156-4c96-8938-24ef9bbc3359', 
   '²² Nisto também, Deus meu, lembra-te de mim e perdoa-me segundo a abundância da tua benignidade.', 
   110, 'Neemias', 13, 22, 'SEU_USER_ID', '2026-01-23 12:50:01.907888+00'),
   
  ('fd11c416-bea8-4623-95b7-34177063ce9c', 
   'af77e6ab-a156-4c96-8938-24ef9bbc3359', 
   '²⁹ Lembra-te deles, Deus meu, pois contaminaram o sacerdócio, como também a aliança do sacerdócio e dos levitas.', 
   111, 'Neemias', 13, 29, 'SEU_USER_ID', '2026-01-23 12:51:12.32761+00'),
   
  ('dc0d2fc7-daf6-43fa-bb04-15b8c3f27510', 
   'af77e6ab-a156-4c96-8938-24ef9bbc3359', 
   '³¹ lembra-te de mim, Deus meu, para bem.', 
   111, 'Neemias', 13, 31, 'SEU_USER_ID', '2026-01-23 12:51:51.997123+00')
ON CONFLICT (id) DO UPDATE SET 
  quote = EXCLUDED.quote,
  page = EXCLUDED.page;

-- =====================================================
-- 8. VOCABULÁRIO (vocabulary)
-- =====================================================
INSERT INTO vocabulary (id, palavra, silabas, fonetica, classe, definicoes, sinonimos, antonimos, exemplos, etimologia, observacoes, analise_contexto, book_id, source_type, source_details, user_id, created_at, updated_at) VALUES
  ('fb212268-aa56-4e2d-962e-617959959891',
   'miríade',
   'mi-rí-a-de',
   '/miˈɾi.a.d͡ʒi/',
   'Substantivo feminino',
   '["Número incalculável ou muito grande de coisas ou pessoas; infinidade.", "Na Grécia Antiga, unidade de dez mil (10.000)."]'::jsonb,
   '[{"sentido": "Sentido de grande quantidade", "palavras": ["infinidade", "multidão", "inúmeros", "incontáveis", "plêiade"]}]'::jsonb,
   '["poucos", "escassez", "pequeno número", "punhado"]'::jsonb,
   '["Uma miríade de estrelas cintilava no céu noturno.", "A miríade de problemas o deixou sem esperança.", "Ele enfrentou uma miríade de desafios para alcançar seu objetivo."]'::jsonb,
   'Do grego myrias, -ados, ''dez mil'', pelo latim myrias, -adis.',
   'Embora o sentido original seja ''dez mil'', na linguagem contemporânea é mais comum o uso para indicar uma quantidade indeterminada, porém muito grande, de algo. Pode ser usado com ou sem a preposição ''de'' (uma miríade de estrelas ou uma miríade estrelas, embora a primeira seja mais comum).',
   '{"frase": "A *miríade* de decisões e escolhas enfrentadas pelos casais cria um potencial infindável para conflitos", "explicacao": "No contexto da frase, ''miríade'' é utilizada para expressar a ideia de uma quantidade extremamente grande e variada de decisões e escolhas que os casais precisam fazer, o que, por sua vez, gera muitos conflitos. Não se refere a um número exato de dez mil, mas sim a uma vastidão.", "fraseReescrita": "A *infinidade* de decisões e escolhas enfrentadas pelos casais cria um potencial infindável para conflitos.", "sentidoIdentificado": "Número incalculável ou muito grande de coisas ou pessoas; infinidade.", "sinonimosAdequados": ["infinidade", "multidão", "inúmeros", "vastidão", "grande quantidade"]}'::jsonb,
   '9b49a41c-1cda-4a30-82f5-917494be0fac',
   'livro',
   '{"author": "CHUCK BENTLEY E ANN BENTLEY", "bookName": "CASAMENTO LIVRE DE CONFLITOS FINANCEIROS", "page": 18}'::jsonb,
   'SEU_USER_ID',
   '2026-01-21 13:59:25.024659+00',
   '2026-01-21 13:59:25.024659+00'),
   
  ('0e159d82-68b9-4e56-bdfb-dc91f605a75d',
   'hipérbole',
   'hi-pér-bo-le',
   '/iˈpɛɾ.bo.le/',
   'Substantivo feminino',
   '["Figura de linguagem que consiste no uso intencional de uma expressão exagerada para enfatizar uma ideia ou sentimento, tornando-o mais impactante ou dramático.", "Exagero retórico ou estilístico.", "Na matemática, curva aberta com duas ramificações simétricas, resultante da interseção de um plano com um cone duplo."]'::jsonb,
   '[{"sentido": "Sentido de exagero retórico", "palavras": ["exagero", "amplificação", "superlativo"]}]'::jsonb,
   '["eufemismo", "atenuação", "litotes"]'::jsonb,
   '["Chorei rios de lágrimas quando soube da notícia.", "Estou morrendo de fome!", "A hipérbole é uma figura de linguagem muito comum na poesia."]'::jsonb,
   'Do grego hyperbolḗ, ''excesso'', ''exagero'', pelo latim hyperbŏle.',
   'É frequentemente utilizada para criar humor, drama ou para expressar emoções intensas. Não deve ser interpretada literalmente.',
   '{"frase": "²¹ Jesus, porém, respondendo, disse-lhes: Em verdade vos digo que, se tiverdes fé e não duvidardes, não só fareis o que foi feito à figueira, mas até (se a este monte disserdes: Ergue-te, e precipita-te no mar, assim será feito; *A hiperbole esta aqui) ²² E, tudo o que pedirdes em oração, crendo, o recebereis. Mateus 21:21,22", "explicacao": "No contexto bíblico, a frase é um exagero proposital para enfatizar o poder da fé. Não se espera que os discípulos literalmente movam montanhas, mas sim que compreendam que, com fé, nada é impossível.", "fraseReescrita": "A amplificação retórica está aqui.", "sentidoIdentificado": "Figura de linguagem que consiste no uso intencional de uma expressão exagerada para enfatizar uma ideia ou sentimento."}'::jsonb,
   'af77e6ab-a156-4c96-8938-24ef9bbc3359',
   'livro',
   '{"author": "pastor Robert Murray McCheyne", "bookName": "BÍBLIA MCCHEYNE", "page": 26}'::jsonb,
   'SEU_USER_ID',
   '2026-01-21 17:47:35.802249+00',
   '2026-01-21 17:47:35.802249+00')
ON CONFLICT (id) DO UPDATE SET 
  palavra = EXCLUDED.palavra,
  definicoes = EXCLUDED.definicoes,
  analise_contexto = EXCLUDED.analise_contexto;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- LEMBRE-SE: Substitua todas as ocorrências de 'SEU_USER_ID' 
-- pelo ID do usuário no seu banco local antes de executar!
-- =====================================================
