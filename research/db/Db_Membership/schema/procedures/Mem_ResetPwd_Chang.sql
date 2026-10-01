-- SQL_STORED_PROCEDURE dbo.Mem_ResetPwd_Chang (modified 2012-04-21T07:54:31.110)



CREATE    PROCEDURE Mem_ResetPwd_Chang 
@SaleEntry uniqueidentifier,
@Result INTEGER OUTPUT ,
@UserName Varchar(256) OUTPUT
AS
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
通过安全码，确认当前安全码是否有效
*/
  /*定义临时变量TEMPCOUNT*/
  DEClARE @TEMPCOUNT INT
  SELECT @TEMPCOUNT=COUNT(*) FROM Mem_ResetPwd WHERE SaleEntry =@SaleEntry AND IsActived =0

  /*如果安全码是有效的，点击过后修改为无效*/
  IF(@TEMPCOUNT=1) 
    BEGIN
      SET @Result=1
      UPDATE Mem_ResetPwd SET IsActived=1 WHERE  SaleEntry =@SaleEntry 
      SELECT TOP 1 @UserName= A.UserName FROM Mem_Users A LEFT OUTER JOIN Mem_ResetPwd B
        ON A.UserId=B.UserId  AND A.ApplicationId=B.ApplicationId
        WHERE  B.SaleEntry =@SaleEntry
    END
  ELSE
    BEGIN
      SET @Result=2
      SET @UserName=NULL
    END
 



GO
