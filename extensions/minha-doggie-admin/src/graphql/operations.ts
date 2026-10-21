/**
 * Operações da GraphQL Admin API (versão = api_version da extensão, 2026-10).
 * Validadas contra o schema oficial com `npm run validate:graphql`
 * (SHOPIFY_ADMIN_SCHEMA). `$app` é resolvido pela Shopify para o namespace da app.
 * Minimização de dados: só o exportador pede nome e email.
 */

export const CUSTOMER_PETS_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminCustomerPets($id: ID!) {
    customer(id: $id) {
      id
      pets: metafield(namespace: "$app", key: "pets") {
        value
        compareDigest
      }
      petSpecies: metafield(namespace: "$app", key: "pet_species") {
        value
      }
      petCount: metafield(namespace: "$app", key: "pet_count") {
        value
      }
    }
  }
`;

export const SET_PETS_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieAdminSetPets($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
        compareDigest
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const DELETE_PET_INDEX_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieAdminDeletePetIndex($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields {
        key
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/** Reindexação: só id + metafields da app (sem dados pessoais). */
export const INDEX_SCAN_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminIndexScan($first: Int!, $after: String) {
    customers(first: $first, after: $after, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        pets: metafield(namespace: "$app", key: "pets") {
          value
          compareDigest
        }
        petSpecies: metafield(namespace: "$app", key: "pet_species") {
          value
        }
        petCount: metafield(namespace: "$app", key: "pet_count") {
          value
        }
      }
    }
  }
`;

/** Exportação (todos os clientes): nome e email só porque são colunas pedidas. */
export const EXPORT_SCAN_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminExportScan($first: Int!, $after: String) {
    customers(first: $first, after: $after, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        firstName
        lastName
        defaultEmailAddress {
          emailAddress
        }
        pets: metafield(namespace: "$app", key: "pets") {
          value
        }
      }
    }
  }
`;

/** Exportação rápida: só membros do segmento `pet_count >= 1` (requer índices sincronizados). */
export const EXPORT_SEGMENT_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminExportSegment($query: String!, $first: Int!, $after: String) {
    customerSegmentMembers(query: $query, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          firstName
          lastName
          defaultEmailAddress {
            emailAddress
          }
          pets: metafield(namespace: "$app", key: "pets") {
            value
          }
        }
      }
    }
  }
`;

/** Exportação dos clientes selecionados na lista. */
export const EXPORT_NODES_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminExportNodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Customer {
        id
        firstName
        lastName
        defaultEmailAddress {
          emailAddress
        }
        pets: metafield(namespace: "$app", key: "pets") {
          value
        }
      }
    }
  }
`;

/** Namespace real (`app--<id>`) das definições app-owned, para as consultas de segmentos. */
export const PET_DEFINITIONS_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminPetDefinitions {
    metafieldDefinitions(ownerType: CUSTOMER, namespace: "$app", first: 10) {
      nodes {
        namespace
        key
        name
      }
    }
    segmentFilterSuggestions(search: "pet_species", first: 10) {
      nodes {
        queryName
        localizedName
      }
    }
  }
`;

/** Valida uma consulta de segmento e conta membros (só leitura). */
export const SEGMENT_COUNT_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminSegmentCount($query: String!) {
    customerSegmentMembers(query: $query, first: 1) {
      totalCount
    }
  }
`;

/** Cria um segmento guardado (só quando um membro da equipa carrega no botão). */
export const SEGMENT_CREATE_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieAdminSegmentCreate($name: String!, $query: String!) {
    segmentCreate(name: $name, query: $query) {
      segment {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const BANNER_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminBanner {
    shop {
      id
      banner: metafield(namespace: "$app", key: "banner") {
        value
      }
    }
  }
`;

export const BANNER_SET_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieAdminSetBanner($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const STAGED_UPLOAD_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieAdminStagedUpload($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const FILE_CREATE_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieAdminFileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const FILE_STATUS_QUERY = /* GraphQL */ `
  query MinhaDoggieAdminFileStatus($id: ID!) {
    node(id: $id) {
      ... on MediaImage {
        id
        fileStatus
        image {
          url
        }
      }
    }
  }
`;

export const ALL_OPERATIONS = {
  BANNER_QUERY,
  BANNER_SET_MUTATION,
  STAGED_UPLOAD_MUTATION,
  FILE_CREATE_MUTATION,
  FILE_STATUS_QUERY,

  CUSTOMER_PETS_QUERY,
  SET_PETS_MUTATION,
  DELETE_PET_INDEX_MUTATION,
  INDEX_SCAN_QUERY,
  EXPORT_SCAN_QUERY,
  EXPORT_SEGMENT_QUERY,
  EXPORT_NODES_QUERY,
  PET_DEFINITIONS_QUERY,
  SEGMENT_COUNT_QUERY,
  SEGMENT_CREATE_MUTATION,
} as const;
