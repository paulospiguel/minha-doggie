/**
 * Operações GraphQL da Customer Account API (versão em constants.ts).
 * Todas são validadas contra o schema oficial com `npm run validate:graphql`.
 * O cliente só consegue ler/escrever os SEUS dados: `customer` é sempre o
 * cliente autenticado e a Shopify rejeita ownerId de outro cliente.
 */

export const CUSTOMER_QUERY = /* GraphQL */ `
  query MinhaDoggieCustomer {
    customer {
      id
      firstName
      pets: metafield(namespace: "$app", key: "pets") {
        value
        compareDigest
      }
    }
    shop {
      banner: metafield(namespace: "$app", key: "banner") {
        value
      }
    }
  }
`;

export const RECENT_ORDERS_QUERY = /* GraphQL */ `
  query MinhaDoggieRecentOrders($first: Int!) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          cancelledAt
          fulfillmentStatus
          totalPrice {
            amount
            currencyCode
          }
          lineItems(first: 1) {
            nodes {
              title
              image {
                url(transform: {maxWidth: 160, maxHeight: 160})
                altText
              }
            }
          }
        }
      }
    }
  }
`;

export const SET_PETS_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieSetPets($metafields: [MetafieldsSetInput!]!) {
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

/**
 * Remove `$app.pet_species` quando o cliente deixa de ter companheiros
 * (listas vazias não são gravadas). Executada só depois de um metafieldsSet bem-sucedido.
 */
export const DELETE_PET_INDEX_MUTATION = /* GraphQL */ `
  mutation MinhaDoggieDeletePetIndex($metafields: [MetafieldIdentifierInput!]!) {
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

export const ALL_OPERATIONS = {
  CUSTOMER_QUERY,
  RECENT_ORDERS_QUERY,
  SET_PETS_MUTATION,
  DELETE_PET_INDEX_MUTATION,
} as const;
