-- SQL_STORED_PROCEDURE dbo.SP_User_Repute (modified 2021-06-04T10:07:15.300)






CREATE PROCEDURE [dbo].[SP_User_Repute]
		   @UserID int
         
AS
BEGIN

WITH OrderedOrders AS  
(  
    SELECT FightPower, UserID ,
    ROW_NUMBER() OVER (ORDER BY FightPower desc) AS RowNumber  
    FROM Sys_Users_Detail   
)   
SELECT  FightPower, RowNumber    
FROM OrderedOrders   
WHERE UserID =@UserID
END












GO
