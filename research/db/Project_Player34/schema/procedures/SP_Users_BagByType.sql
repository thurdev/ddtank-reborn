-- SQL_STORED_PROCEDURE dbo.SP_Users_BagByType (modified 2021-06-04T05:18:36.043)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户背包物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_BagByType]
 @UserID int,
 @BagType int
 AS  
   begin 
     select * from Sys_Users_Goods  
where UserID = @UserID and IsExist = 1 and place>=0 and BagType=@BagType
   end








GO
