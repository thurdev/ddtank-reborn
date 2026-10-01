-- SQL_STORED_PROCEDURE dbo.SP_Update_Repute (modified 2021-06-04T05:18:35.857)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<????????>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Update_Repute]

AS  

UPDATE Sys_Users_Detail
SET Sys_Users_Detail.Repute = test_V.Repute
FROM Sys_Users_Detail
JOIN test_V
ON Sys_Users_Detail.UserID = test_V.UserID






GO
