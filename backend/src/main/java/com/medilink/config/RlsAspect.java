package com.medilink.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.medilink.domain.user.User;

@Aspect
@Component
@Slf4j
public class RlsAspect {

    @PersistenceContext
    private EntityManager em;

    /**
     * Before any @Transactional service method, push the authenticated user's ID
     * into the PostgreSQL session config so RLS policies can use it.
     * The 'true' flag makes it LOCAL to the current transaction only —
     * safe with connection pooling (HikariCP).
     */
    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object setRlsContext(ProceedingJoinPoint pjp) throws Throwable {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            try {
                em.createNativeQuery(
                    "SELECT set_config('app.current_user_id', :uid, true)"
                )
                .setParameter("uid", user.getId().toString())
                .getSingleResult();
            } catch (Exception e) {
                log.warn("Could not set RLS context: {}", e.getMessage());
            }
        }
        return pjp.proceed();
    }
}
