-- SQL_STORED_PROCEDURE dbo.SP_Category_Name_Single (modified 2021-07-07T12:22:43.290)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<任务信息：加载一条任务信息>
-- =============================================
Create  PROCEDURE [dbo].[SP_Category_Name_Single]
@ID int
 AS  
   begin 
     select * from Shop_Goods_Categorys where ID=@ID
   end









GO
