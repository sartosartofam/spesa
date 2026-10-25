import { useEffect, useState } from 'preact/hooks'
import { isLiveData } from '../lib/data'
import {
  type FamilyMember,
  type FamilyPerson,
  familyPeople,
  listFamilyMembers,
} from '../lib/family'

/**
 * Nomi delle persone che condividono la lista. In modalità mock, o finché la
 * lettura remota non risponde, resta visibile almeno l'utente corrente.
 */
export function useFamilyPeople(
  currentUserId: string,
  currentUserName: string,
  familyId: string | null,
): FamilyPerson[] {
  const [members, setMembers] = useState<FamilyMember[]>([])

  useEffect(() => {
    setMembers([])
    if (!isLiveData || !currentUserId) return

    let cancelled = false
    listFamilyMembers()
      .then((rows) => {
        if (!cancelled) setMembers(rows)
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })

    return () => {
      cancelled = true
    }
  }, [currentUserId, familyId])

  return familyPeople(members, currentUserId, currentUserName)
}
