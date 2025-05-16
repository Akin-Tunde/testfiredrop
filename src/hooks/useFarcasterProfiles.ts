// src/hooks/useFarcasterProfiles.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { FarcasterUserProfile } from "../types/global";
import { getAddress, isAddress } from "viem";

// --- Configuration for Neynar API ---
const NEYNAR_API_KEY = import.meta.env.VITE_NEYNAR_API_KEY;
const NEYNAR_API_USER_BULK_BY_ADDRESS_URL =
  "https://api.neynar.com/v2/farcaster/user/bulk-by-address";

interface NeynarUserV2 {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string | null;
  custody_address: string;
}

interface NeynarBulkUsersResponse {
  [key: string]: NeynarUserV2[];
}
// --- End Configuration ---

const profileCache = new Map<string, FarcasterUserProfile>();
const inflightRequests = new Set<string>();

async function fetchFarcasterProfilesFromApi(
  addressesToFetch: string[]
): Promise<Record<string, FarcasterUserProfile>> {
  console.log(
    "[API] fetchFarcasterProfilesFromApi CALLED. Addresses:",
    addressesToFetch
  );
  if (!NEYNAR_API_KEY) {
    console.warn("[API] Neynar API key MISSING.");
    return {};
  }
  if (addressesToFetch.length === 0) {
    console.log("[API] No addresses to fetch.");
    return {};
  }

  const uniqueNormalizedAddresses = [
    ...new Set(addressesToFetch.map((addr) => getAddress(addr))),
  ];
  const localResults: Record<string, FarcasterUserProfile> = {};
  const CHUNK_SIZE = 50;

  for (let i = 0; i < uniqueNormalizedAddresses.length; i += CHUNK_SIZE) {
    const chunk = uniqueNormalizedAddresses.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;

    const addressesParam = chunk.join(",");
    const requestUrl = `${NEYNAR_API_USER_BULK_BY_ADDRESS_URL}?addresses=${addressesParam}`;
    console.log(`[API] Fetching chunk URL: ${requestUrl}`);

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: { api_key: NEYNAR_API_KEY, accept: "application/json" },
      });

      console.log(
        `[API] Response for chunk ${addressesParam}: Status ${response.status}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `[API] Neynar API ERROR for ${addressesParam}: ${response.status} ${response.statusText}`,
          errorText
        );
        chunk.forEach((addr) => {
          if (!profileCache.has(addr)) {
            // Cache with null displayName/username so UI can fall back to address
            profileCache.set(addr, {
              username: null,
              displayName: null,
              pfpUrl: null,
              custodyAddress: addr,
            });
            console.log(`[API] Cached API error (as not found) for ${addr}`);
          }
        });
        continue;
      }

      const data = (await response.json()) as NeynarBulkUsersResponse;
      console.log(
        `[API] Data received for ${addressesParam}:`,
        JSON.stringify(data).substring(0, 500) + "..."
      );

      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        Object.entries(data).forEach(
          ([custodyAddrFromResponse, neynarUsersArray]) => {
            if (!isAddress(custodyAddrFromResponse)) {
              console.warn(
                `[API] Invalid address key in response: ${custodyAddrFromResponse}`
              );
              return;
            }
            const normalizedCustodyAddress = getAddress(
              custodyAddrFromResponse
            );

            if (neynarUsersArray && neynarUsersArray.length > 0) {
              const primaryNeynarUser = neynarUsersArray[0];
              const userProfile: FarcasterUserProfile = {
                fid: primaryNeynarUser.fid,
                username: primaryNeynarUser.username,
                displayName: primaryNeynarUser.display_name,
                pfpUrl: primaryNeynarUser.pfp_url,
                custodyAddress: normalizedCustodyAddress,
              };
              console.log(
                `[API] Profile FOUND for ${normalizedCustodyAddress}: ${userProfile.username}`
              );
              localResults[normalizedCustodyAddress] = userProfile;
              profileCache.set(normalizedCustodyAddress, userProfile);
              // console.log(`[API] Cached profile for ${normalizedCustodyAddress}. localResults keys: ${Object.keys(localResults).join(', ')}`);
            } else {
              if (!profileCache.has(normalizedCustodyAddress)) {
                profileCache.set(normalizedCustodyAddress, {
                  username: null,
                  displayName: null,
                  pfpUrl: null,
                  custodyAddress: normalizedCustodyAddress,
                });
                console.log(
                  `[API] No user data for ${normalizedCustodyAddress}, cached as not found.`
                );
              }
            }
          }
        );
      } else {
        console.warn(
          `[API] Neynar response for ${addressesParam} is empty or not an object as expected.`
        );
      }

      chunk.forEach((addr) => {
        if (!localResults[addr] && !profileCache.has(addr)) {
          profileCache.set(addr, {
            username: null,
            displayName: null,
            pfpUrl: null,
            custodyAddress: addr,
          });
          console.log(
            `[API] Address ${addr} not in Neynar response data, cached as not found.`
          );
        }
      });
    } catch (error) {
      console.error(
        `[API] Network/parsing ERROR for ${addressesParam}:`,
        error
      );
      chunk.forEach((addr) => {
        if (!profileCache.has(addr)) {
          // Cache with null displayName/username so UI can fall back to address
          profileCache.set(addr, {
            username: null,
            displayName: null,
            pfpUrl: null,
            custodyAddress: addr,
          });
          console.log(`[API] Cached fetch error (as not found) for ${addr}`);
        }
      });
    }
  }
  // console.log(`[API] fetchFarcasterProfilesFromApi RETURNING localResults. Keys: ${Object.keys(localResults).join(', ')}. Full:`, localResults);
  return localResults;
}

export function useFarcasterProfiles() {
  const [profiles, setProfiles] = useState<
    Record<string, FarcasterUserProfile>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getProfilesByAddresses = useCallback(
    async (
      addressesToFetch: string[]
    ): Promise<Record<string, FarcasterUserProfile>> => {
      if (addressesToFetch.length === 0) {
        return {};
      }

      const uniqueNormalizedAddresses = [
        ...new Set(
          addressesToFetch
            .filter((addr) => isAddress(addr))
            .map((addr) => getAddress(addr))
        ),
      ];
      const addressesToActuallyFetch: string[] = [];
      const newProfilesFromCache: Record<string, FarcasterUserProfile> = {};
      let shouldTriggerLoading = false;

      for (const addr of uniqueNormalizedAddresses) {
        if (profileCache.has(addr)) {
          newProfilesFromCache[addr] = profileCache.get(addr)!;
        } else if (!inflightRequests.has(addr)) {
          addressesToActuallyFetch.push(addr);
          inflightRequests.add(addr);
          shouldTriggerLoading = true;
        }
      }

      if (Object.keys(newProfilesFromCache).length > 0 && mountedRef.current) {
        setProfiles((prev) => ({ ...prev, ...newProfilesFromCache }));
      }

      if (addressesToActuallyFetch.length > 0) {
        if (shouldTriggerLoading && mountedRef.current) {
          setIsLoading(true);
        }

        try {
          const fetchedApiProfiles = await fetchFarcasterProfilesFromApi(
            addressesToActuallyFetch
          );
          if (mountedRef.current) {
            setProfiles((prev) => ({ ...prev, ...fetchedApiProfiles }));
          }
        } catch (error) {
          console.error(
            "[Hook] Error during API fetch in getProfilesByAddresses:",
            error
          );
        } finally {
          addressesToActuallyFetch.forEach((addr) => {
            inflightRequests.delete(addr);
          });
          if (mountedRef.current && inflightRequests.size === 0) {
            setIsLoading(false);
          }
        }
      } else if (
        Object.keys(newProfilesFromCache).length ===
        uniqueNormalizedAddresses.length
      ) {
        if (mountedRef.current && isLoading) {
          setIsLoading(false);
        }
      }

      const finalResults: Record<string, FarcasterUserProfile> = {};
      uniqueNormalizedAddresses.forEach((addr) => {
        if (profileCache.has(addr)) {
          finalResults[addr] = profileCache.get(addr)!;
        } else {
          // If still not in cache after attempting fetch, provide a default that allows fallback to address
          finalResults[addr] = {
            username: null,
            displayName: null,
            pfpUrl: null,
            custodyAddress: addr,
          };
        }
      });
      return finalResults;
    },
    []
  );

  const getProfile = useCallback(
    (addressToFetch: string): FarcasterUserProfile | undefined => {
      if (!addressToFetch || !isAddress(addressToFetch)) return undefined;
      const normalizedAddress = getAddress(addressToFetch);
      return profiles[normalizedAddress] || profileCache.get(normalizedAddress);
    },
    [profiles]
  );

  return {
    profiles,
    getProfilesByAddresses,
    getProfile,
    isLoadingProfiles: isLoading,
  };
}
