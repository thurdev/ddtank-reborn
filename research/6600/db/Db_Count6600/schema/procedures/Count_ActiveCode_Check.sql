-- SQL_STORED_PROCEDURE dbo.Count_ActiveCode_Check (modified 2012-04-21T07:53:24.793)


-- =============================================
-- Author:         <andy>
-- ALTER  date: <2010-01-26>
-- Description:  <检验用户是否有有激活>
-- =============================================
CREATE   PROCEDURE [dbo].[Count_ActiveCode_Check]
@UserName varchar(50),
@ouototal INT output 
AS
SET @ouototal=0
/*第一步：检验用户是否有有激活*/
SELECT @ouototal=COUNT(*) FROM Count_ActiveCode WHERE UserName =@UserName



GO
